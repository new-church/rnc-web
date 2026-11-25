import type { Kv } from './kv';
import { key } from '../items-table/keys';
import { signupConfig } from '../signup/config';
import { hmac, randomToken, safeEqual } from './crypto';
import { memberConfig } from './config';
import type { DetailsInput } from './people';
import { isEmail, normaliseEmail, parseExtra } from './validate';

export type SignupData = { email: string; first: string; last: string; lists: string[]; extra: DetailsInput };

export function parseSignupForm(form: FormData): { ok: true; value: SignupData } | { ok: false; error: string } {
  const text = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const email = normaliseEmail(text('email', 200));
  const first = text('first', 80);
  const last = text('last', 80);
  const picked = new Set(form.getAll('lists').map(String));
  const lists = signupConfig.lists.filter((l) => picked.has(l.id)).map((l) => l.id);
  if (!isEmail(email) || !first || !last || lists.length === 0) {
    return { ok: false, error: 'Please check your name and email address, and choose at least one list.' };
  }
  const extra = parseExtra(form);
  if (!extra.ok) return extra;
  return { ok: true, value: { email, first, last, lists, extra: extra.value } };
}

type Row = SignupData & { secretHash: string; attempts: number; expiresAt: number; createdAt: string };

/** Stores a pending signup and returns the reference to put in the emailed link ("id.secret"). */
export async function createSignup(kv: Kv, data: SignupData, now = Date.now()): Promise<string> {
  const id = randomToken(12);
  const secret = randomToken(24);
  const expiresAt = now + memberConfig.ttl.signup * 1000;
  const row: Row = { ...data, secretHash: hmac('signup', secret), attempts: 0, expiresAt, createdAt: new Date(now).toISOString() };
  await kv.put({ pk: key('SIGNUP', id), sk: 'PENDING', entityType: 'signup', data: row, ttl: new Date(expiresAt) });
  return `${id}.${secret}`;
}

/** Looks up a pending signup by its link reference. Five wrong secrets for one id delete it. */
export async function readSignup(kv: Kv, ref: string): Promise<SignupData | null> {
  const [id, secret] = ref.split('.');
  if (!id || !secret || id.includes('#') || ref.split('.').length !== 2) return null;
  const k = { pk: key('SIGNUP', id), sk: 'PENDING' };
  const item = await kv.get(k);
  if (!item) return null;
  const row = item.data as unknown as Row;
  if (!safeEqual(row.secretHash, hmac('signup', secret))) {
    if (row.attempts + 1 >= memberConfig.challenge.maxAttempts) await kv.delete(k);
    else await kv.put({ ...k, entityType: 'signup', data: { ...row, attempts: row.attempts + 1 }, ttl: new Date(row.expiresAt) });
    return null;
  }
  const { secretHash: _s, attempts: _a, expiresAt: _e, createdAt: _c, ...data } = row;
  return data;
}

export async function deleteSignup(kv: Kv, ref: string): Promise<void> {
  const id = ref.split('.')[0];
  if (id && !id.includes('#')) await kv.delete({ pk: key('SIGNUP', id), sk: 'PENDING' });
}
