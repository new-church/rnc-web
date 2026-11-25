import type { Kv } from './kv';
import { key } from '../items-table/keys';
import { memberConfig } from './config';
import { hmac, ipHash, safeEqual, sha256, sixDigitCode } from './crypto';
import { mails, sendMail } from './mail';
import type { PeopleApi } from './people';
import { withinLimit } from './rate';
import { createAdminSession } from '../auth/admin-session';
import { createSession, type Candidate } from './session';
import { isEmail, normaliseEmail } from './validate';

type Challenge = { codeHash: string; attempts: number; sentAt: number; expiresAt: number; ipHash: string };
const challengeKey = (email: string) => ({ pk: key('LOGIN', email), sk: 'CHALLENGE' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Deps = {
  kv: Kv;
  people: PeopleApi;
  /** Whether this address belongs to an administrator (a USER# row with an admin scope). */
  isAdmin?: (email: string) => Promise<boolean>;
  now?: () => number;
};

const adminOf = async (deps: Deps, email: string) => (deps.isAdmin ? deps.isAdmin(email) : false);

/**
 * Step 1 of sign-in (one code for everything): emails a 6-digit code if an active person has this address, or it belongs
 * to an administrator. It always answers the same way (and takes a similar time), so it can't be used to find out who is
 * on file. Only a malformed address is reported.
 */
export async function startLogin(deps: Deps, rawEmail: string, ip: string | undefined): Promise<{ ok: boolean }> {
  const { kv, people } = deps;
  const now = (deps.now ?? Date.now)();
  const email = normaliseEmail(rawEmail);
  if (!isEmail(email)) return { ok: false };
  const emailKey = sha256(email).slice(0, 24);
  const ipKey = ipHash(ip);

  const allowed =
    (await withinLimit(kv, 'login-email', emailKey, memberConfig.rate.loginPerEmail, now)) &&
    (await withinLimit(kv, 'login-ip', ipKey, memberConfig.rate.loginPerIp, now));
  if (!allowed) return { ok: true };

  const existing = await kv.get(challengeKey(email));
  const recent = existing && now - (existing.data as unknown as Challenge).sentAt < memberConfig.challenge.resendAfterSeconds * 1000;
  if (recent) return { ok: true };

  const active = (await people.findByEmail(email)).filter((p) => p.status === 'active');
  if (!active.length && !(await adminOf(deps, email))) {
    await sleep(250 + Math.random() * 250); // roughly the time a real send takes
    return { ok: true };
  }

  const code = sixDigitCode();
  const expiresAt = now + memberConfig.ttl.challenge * 1000;
  const row: Challenge = { codeHash: hmac('login', `${email}:${code}`), attempts: 0, sentAt: now, expiresAt, ipHash: ipKey };
  // One live challenge per address: this replaces any earlier code.
  await kv.put({ ...challengeKey(email), entityType: 'login_challenge', data: row, ttl: new Date(expiresAt) });
  try {
    await sendMail(mails.loginCode(email, code));
  } catch (err) {
    console.error('[members] login code email failed', err instanceof Error ? err.message : err);
  }
  return { ok: true };
}

/**
 * One code opens everything the address qualifies for: a member session if an active person has it, and an admin
 * session if it belongs to an administrator. `needsChoice` means several people share the address.
 */
export type VerifyResult =
  | { ok: true; member: { token: string; needsChoice: boolean } | null; admin: { token: string } | null }
  | { ok: false };

/** Step 2: checks the code (5 tries, 10 minutes, single use) and starts the session or sessions. */
export async function verifyLogin(deps: Deps, rawEmail: string, rawCode: string, ip: string | undefined): Promise<VerifyResult> {
  const { kv, people } = deps;
  const now = (deps.now ?? Date.now)();
  const email = normaliseEmail(rawEmail);
  const code = rawCode.replace(/\s/g, '');
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return { ok: false };

  const allowed =
    (await withinLimit(kv, 'verify-email', sha256(email).slice(0, 24), memberConfig.rate.verifyPerEmail, now)) &&
    (await withinLimit(kv, 'verify-ip', ipHash(ip), memberConfig.rate.verifyPerIp, now));
  if (!allowed) return { ok: false };

  const k = challengeKey(email);
  const item = await kv.get(k);
  if (!item) return { ok: false };
  const c = item.data as unknown as Challenge;
  if (now >= c.expiresAt) return { ok: false };

  if (!safeEqual(c.codeHash, hmac('login', `${email}:${code}`))) {
    if (c.attempts + 1 >= memberConfig.challenge.maxAttempts) await kv.delete(k);
    else await kv.put({ ...k, entityType: 'login_challenge', data: { ...c, attempts: c.attempts + 1 }, ttl: new Date(c.expiresAt) });
    return { ok: false };
  }
  await kv.delete(k); // single use

  const active = (await people.findByEmail(email)).filter((p) => p.status === 'active');
  const admin = await adminOf(deps, email);
  if (!active.length && !admin) return { ok: false };

  let member: { token: string; needsChoice: boolean } | null = null;
  if (active.length === 1) {
    member = { token: await createSession(kv, { email, personId: active[0].id }, now), needsChoice: false };
  } else if (active.length > 1) {
    const candidates: Candidate[] = active.map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName.slice(0, 1)}.`.trim() }));
    member = { token: await createSession(kv, { email, personId: null, candidates }, now), needsChoice: true };
  }
  return { ok: true, member, admin: admin ? { token: await createAdminSession(kv, email, now) } : null };
}
