import type { AstroCookies } from 'astro';
import type { Kv } from './kv';
import { key } from '../items-table/keys';
import { isProduction } from '../signup';
import { loginCookieName, memberConfig, sessionCookieName } from './config';
import { randomToken, safeEqual, sha256 } from './crypto';

export type Candidate = { id: string; label: string };
export type MemberSession = {
  /** hash of the cookie token (the row key); never the token itself */
  ref: string;
  email: string;
  /** Planning Center person, null until chosen from `candidates` */
  personId: string | null;
  candidates: Candidate[];
  csrf: string;
  createdAt: number;
  lastSeen: number;
};

const sessionKey = (token: string) => ({ pk: key('SESSION', sha256(token)), sk: 'SESSION' });

/** Row expiry: 30 minutes idle, 8 hours absolute. */
function expiryFor(createdAt: number, now: number): Date {
  return new Date(Math.min(now + memberConfig.ttl.sessionIdle * 1000, createdAt + memberConfig.ttl.sessionAbsolute * 1000));
}

export async function createSession(
  kv: Kv,
  input: { email: string; personId: string | null; candidates?: Candidate[] },
  now = Date.now(),
): Promise<string> {
  const token = randomToken(32);
  const data = { email: input.email, personId: input.personId, candidates: input.candidates ?? [], csrf: randomToken(16), createdAt: now, lastSeen: now };
  await kv.put({ ...sessionKey(token), entityType: 'session', data, ttl: expiryFor(now, now) });
  return token;
}

/** Reads the session behind a cookie token and slides its idle expiry (at most once a minute). */
export async function readSession(kv: Kv, token: string | undefined, now = Date.now()): Promise<MemberSession | null> {
  if (!token || token.length < 20) return null;
  const k = sessionKey(token);
  const row = await kv.get(k);
  if (!row) return null;
  const d = row.data as unknown as Omit<MemberSession, 'ref'>;
  if (now >= d.createdAt + memberConfig.ttl.sessionAbsolute * 1000) {
    await kv.delete(k);
    return null;
  }
  let lastSeen = d.lastSeen;
  if (now - d.lastSeen > 60_000) {
    lastSeen = now;
    await kv.put({ ...k, entityType: 'session', data: { ...d, lastSeen }, ttl: expiryFor(d.createdAt, now) });
  }
  return { ...d, lastSeen, ref: k.pk };
}

export async function setSessionPerson(kv: Kv, token: string, personId: string): Promise<void> {
  const k = sessionKey(token);
  const row = await kv.get(k);
  if (!row) return;
  const d = row.data as Record<string, unknown>;
  const allowed = ((d.candidates as Candidate[]) ?? []).some((c) => c.id === personId);
  if (!allowed) throw new Error('person is not one of the candidates');
  await kv.put({ ...k, entityType: 'session', data: { ...d, personId, candidates: [] }, ttl: expiryFor(Number(d.createdAt), Date.now()) });
}

export async function destroySession(kv: Kv, token: string | undefined): Promise<void> {
  if (token) await kv.delete(sessionKey(token));
}

export const csrfOk = (session: MemberSession, submitted: FormDataEntryValue | null) =>
  typeof submitted === 'string' && safeEqual(session.csrf, submitted);

// ---- cookies -----------------------------------------------------------------------------------

const cookieBase = () => ({ path: '/', httpOnly: true, secure: isProduction(), sameSite: 'lax' as const });

export const sessionToken = (cookies: AstroCookies) => cookies.get(sessionCookieName(isProduction()))?.value;
export const setSessionCookie = (cookies: AstroCookies, token: string) =>
  cookies.set(sessionCookieName(isProduction()), token, { ...cookieBase(), maxAge: memberConfig.ttl.sessionAbsolute });
export const clearSessionCookie = (cookies: AstroCookies) => cookies.delete(sessionCookieName(isProduction()), { path: '/' });

/** Holds the email between the "enter your email" and "enter your code" pages, so it never appears in a URL. */
export const loginEmail = (cookies: AstroCookies) => cookies.get(loginCookieName(isProduction()))?.value;
export const setLoginEmail = (cookies: AstroCookies, email: string) =>
  cookies.set(loginCookieName(isProduction()), email, { ...cookieBase(), maxAge: memberConfig.ttl.login });
export const clearLoginEmail = (cookies: AstroCookies) => cookies.delete(loginCookieName(isProduction()), { path: '/' });

/**
 * A plain "signed in" marker (no personal data, readable by the page) so the header only asks the server who is signed
 * in when there is a session at all: visitors who never signed in make no extra request.
 */
export const MARKER_COOKIE = 'rnc_in';
export const setSignedInMarker = (cookies: AstroCookies) =>
  cookies.set(MARKER_COOKIE, '1', { path: '/', httpOnly: false, secure: isProduction(), sameSite: 'lax', maxAge: memberConfig.ttl.sessionAbsolute });
export const clearSignedInMarker = (cookies: AstroCookies) => cookies.delete(MARKER_COOKIE, { path: '/' });
