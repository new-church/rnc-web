/**
 * Mailing list signup with double opt-in.
 *
 *   1. The form posts to /api/subscribe: Turnstile check, then a confirmation email (Postmark) holding a
 *      signed, expiring link. Nothing is written to Planning Center yet.
 *   2. The link opens /subscribe/confirm, where the person presses a button (so mail scanners that
 *      prefetch links can't confirm for them). That posts to /api/subscribe/confirm, which finds or creates
 *      the person in Planning Center and ticks the chosen "Communication preferences" options.
 *
 * Outside production the Turnstile "always passes" test keys are used and no email or Planning Center write
 * happens (the link is logged to the console), unless SIGNUP_LIVE=1.
 *
 * Env: TURNSTILE_KEYS ("sitekey,secret"), POSTMARK_TOKEN, PLANNING_CENTER_PAT, PLANNING_CENTER_PAT_SECRET,
 * SIGNUP_SECRET (signs the confirmation links). Optional: POSTMARK_MESSAGE_STREAM, SIGNUP_LIVE.
 *
 * This file is duplicated in rnc-web and sc-www; keep the two in step (only config.ts differs).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { signupConfig, type SignupList } from './config';

function env(name: string): string | undefined {
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return meta?.[name] || process.env[name] || undefined;
}

/** Page path under /subscribe, e.g. signupPath('/confirm'). */
export const signupPath = (suffix = '') => `/subscribe${suffix}${signupConfig.trailingSlash ? '/' : ''}`;
/** Form-post endpoint path under /api/subscribe. */
export const apiPath = (suffix = '') => `/api/subscribe${suffix}${signupConfig.trailingSlash ? '/' : ''}`;

/** A real production deploy (not a preview, and not local even if built for production). */
export const isProduction = () => process.env.VERCEL_ENV === 'production';
/** Whether to really send email and write to Planning Center. */
export const isLive = () => isProduction() || env('SIGNUP_LIVE') === '1';

// ---- Turnstile ---------------------------------------------------------------------------------

// Cloudflare's published test keys: the widget always passes. https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_KEYS = { siteKey: '1x00000000000000000000AA', secret: '1x0000000000000000000000000000000AA' };

/** Keys for this environment; null when production has none configured (the form then refuses to work). */
export function turnstileKeys(): { siteKey: string; secret: string } | null {
  if (!isProduction()) return TEST_KEYS;
  const [siteKey, secret] = (env('TURNSTILE_KEYS') ?? '').split(',').map((s) => s.trim());
  return siteKey && secret ? { siteKey, secret } : null;
}

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const keys = turnstileKeys();
  if (!keys || !token) return false;
  const body = new URLSearchParams({ secret: keys.secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

// ---- Signed confirmation tokens ------------------------------------------------------------------

export type Subscription = { email: string; first: string; last: string; lists: string[] };
const TOKEN_DAYS = 7;

function key(): string {
  const k = env('SIGNUP_SECRET');
  if (k) return k;
  if (isLive()) throw new Error('Missing SIGNUP_SECRET');
  return 'dev-only-signup-secret';
}
// The site URL is mixed into the key so a token from one site is never valid on the other.
const mac = (data: string) => createHmac('sha256', `${key()}:${signupConfig.siteUrl}`).update(data).digest('base64url');

export function signToken(s: Subscription): string {
  const payload = Buffer.from(JSON.stringify({ ...s, x: Date.now() + TOKEN_DAYS * 86_400_000 })).toString('base64url');
  return `${payload}.${mac(payload)}`;
}

export function readToken(token: string): Subscription | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const want = Buffer.from(mac(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { x, ...s } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof x === 'number' && x > Date.now() ? (s as Subscription) : null;
  } catch {
    return null;
  }
}

// ---- Validation ----------------------------------------------------------------------------------

export function parseForm(form: FormData): { ok: true; value: Subscription } | { ok: false } {
  const text = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const email = text('email', 200).toLowerCase();
  const first = text('first', 80);
  const last = text('last', 80);
  const picked = new Set(form.getAll('lists').map(String));
  const lists = signupConfig.lists.filter((l) => picked.has(l.id)).map((l) => l.id);
  const emailOk = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email);
  if (!emailOk || !first || !last || lists.length === 0) return { ok: false };
  return { ok: true, value: { email, first, last, lists } };
}

export const listsFor = (ids: string[]): SignupList[] => signupConfig.lists.filter((l) => ids.includes(l.id));

// ---- Postmark ------------------------------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function sendConfirmation(s: Subscription, link: string): Promise<void> {
  const chosen = listsFor(s.lists).map((l) => l.label);
  const subject = `Please confirm your subscription to ${signupConfig.siteName}`;
  const text = [
    `Hello ${s.first},`,
    '',
    `Someone (hopefully you) asked to receive these emails from ${signupConfig.siteName}:`,
    ...chosen.map((c) => `  - ${c}`),
    '',
    'To confirm, open this link and press the Confirm button:',
    link,
    '',
    `The link works for ${TOKEN_DAYS} days. If you didn't ask for this, just ignore this email and you won't be subscribed.`,
    '',
    `Questions? Reply to this email or phone ${signupConfig.contactPhone}.`,
    signupConfig.siteName,
  ].join('\n');
  const html = `<p>Hello ${esc(s.first)},</p>
<p>Someone (hopefully you) asked to receive these emails from ${esc(signupConfig.siteName)}:</p>
<ul>${chosen.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<p><a href="${esc(link)}" style="display:inline-block;padding:10px 20px;background:#4b3a7a;color:#fff;text-decoration:none;border-radius:6px">Confirm my subscription</a></p>
<p>Or copy this link into your browser:<br>${esc(link)}</p>
<p>The link works for ${TOKEN_DAYS} days. If you didn't ask for this, just ignore this email and you won't be subscribed.</p>
<p>Questions? Reply to this email or phone ${esc(signupConfig.contactPhone)}.<br>${esc(signupConfig.siteName)}</p>`;

  if (!isLive()) {
    console.log(`[signup] (not sent: not live) confirmation link for ${s.email}: ${link}`);
    return;
  }
  const token = env('POSTMARK_TOKEN') ?? env('POSTMARK_SERVER_TOKEN');
  if (!token) throw new Error('Missing POSTMARK_TOKEN');
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'X-Postmark-Server-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      From: signupConfig.from,
      To: s.email,
      ReplyTo: signupConfig.replyTo,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
      MessageStream: env('POSTMARK_MESSAGE_STREAM') ?? 'outbound',
    }),
  });
  if (!r.ok) throw new Error(`Postmark ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// ---- Planning Center -----------------------------------------------------------------------------

const PCO = 'https://api.planningcenteronline.com/people/v2';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

async function pco(method: string, path: string, body?: unknown): Promise<J> {
  const auth = Buffer.from(`${env('PLANNING_CENTER_PAT')}:${env('PLANNING_CENTER_PAT_SECRET')}`).toString('base64');
  const r = await fetch(PCO + path, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Planning Center ${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.status === 204 ? {} : r.json();
}

const resource = (type: string, attributes: object, relationships?: object) => ({
  data: { type, attributes, ...(relationships ? { relationships } : {}) },
});

/**
 * Finds the person by email (or creates them), ticks the chosen mailing options, and clears the
 * "Unsubscribed" flag (keeping its date, see below): the confirmed link is fresh consent. Existing names are never overwritten.
 */
export async function subscribeInPlanningCenter(s: Subscription): Promise<{ created: boolean }> {
  if (!isLive()) {
    console.log(`[signup] (not written: not live) would subscribe ${s.email} to ${s.lists.join(', ')}`);
    return { created: false };
  }
  if (!env('PLANNING_CENTER_PAT') || !env('PLANNING_CENTER_PAT_SECRET')) throw new Error('Missing Planning Center token');

  const defs: J[] = (await pco('GET', '/field_definitions?per_page=100')).data;
  const fieldId = (name: string) => defs.find((d) => d.attributes.name === name)?.id as string | undefined;
  const prefsId = fieldId('Communication preferences');
  if (!prefsId) throw new Error('Planning Center field "Communication preferences" not found');

  // Find an existing person by email. (The emails endpoint ignores include=person, so read the relationship.)
  // With several people on one address (a shared email), prefer the one whose first name matches.
  const found = await pco('GET', `/emails?where[address]=${encodeURIComponent(s.email)}&per_page=25`);
  const ids = [...new Set<string>((found.data as J[]).map((e) => e.relationships?.person?.data?.id).filter(Boolean))];
  let personId: string | undefined = ids[0];
  if (ids.length > 1) {
    for (const id of ids.slice(0, 5)) {
      const p = (await pco('GET', `/people/${id}`)).data;
      if ((p.attributes.first_name ?? '').toLowerCase() === s.first.toLowerCase()) {
        personId = id;
        break;
      }
    }
  }
  let created = false;

  if (!personId) {
    personId = (await pco('POST', '/people', resource('Person', { first_name: s.first, last_name: s.last }))).data.id;
    await pco('POST', `/people/${personId}/emails`, resource('Email', { address: s.email, location: 'Home', primary: true }));
    created = true;
  }

  const rows: J[] = created ? [] : (await pco('GET', `/people/${personId}/field_data?per_page=100`)).data;
  const rel = (id: string) => ({ field_definition: { data: { type: 'FieldDefinition', id } } });
  const has = (id: string) => rows.filter((r) => r.relationships?.field_definition?.data?.id === id);

  const haveOptions = new Set(has(prefsId).map((r) => r.attributes.value));
  for (const l of listsFor(s.lists)) {
    if (!haveOptions.has(l.option)) {
      await pco('POST', `/people/${personId}/field_data`, resource('FieldDatum', { value: l.option }, rel(prefsId)));
    }
  }
  // Clear only the Unsubscribed flag. Keep "Unsubscribed on": the daily Planning Center -> Mailchimp sync reads
  // "flag cleared, date kept" as a resubscribe request and sets the person to pending in Mailchimp (which
  // sends its own confirmation email). Without the date it would re-flag them as unsubscribed instead.
  const unsubId = fieldId('Unsubscribed');
  if (unsubId) for (const r of has(unsubId)) await pco('DELETE', `/people/${personId}/field_data/${r.id}`);
  return { created };
}
