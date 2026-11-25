/**
 * Admin sessions: our own, in the items table (no Supabase Auth). The cookie holds a random token; the table holds only
 * its hash. Separate cookie and keys from the member sessions, so a member session can never open the admin area.
 * Who counts as an admin is decided on every request from the USER# row (scopes), not stored in the session.
 */
import type { AstroCookies } from 'astro';
import { key } from '../items-table/keys';
import { memberConfig } from '../members/config';
import { randomToken, sha256 } from '../members/crypto';
import type { Kv } from '../members/kv';
import { isProduction } from '../signup';

export type AdminSession = { email: string; createdAt: number; lastSeen: number };

const sessionKey = (token: string) => ({ pk: key('ADMINSESSION', sha256(token)), sk: 'SESSION' });

/** Row expiry: 30 minutes idle, 8 hours absolute (same as members). */
const expiryFor = (createdAt: number, now: number) =>
  new Date(Math.min(now + memberConfig.ttl.sessionIdle * 1000, createdAt + memberConfig.ttl.sessionAbsolute * 1000));

export async function createAdminSession(kv: Kv, email: string, now = Date.now()): Promise<string> {
  const token = randomToken(32);
  await kv.put({ ...sessionKey(token), entityType: 'admin_session', data: { email, createdAt: now, lastSeen: now }, ttl: expiryFor(now, now) });
  return token;
}

/** Reads the session behind a token and slides its idle expiry (at most once a minute). */
export async function readAdminSession(kv: Kv, token: string | undefined, now = Date.now()): Promise<AdminSession | null> {
  if (!token || token.length < 20) return null;
  const k = sessionKey(token);
  const row = await kv.get(k);
  if (!row) return null;
  const d = row.data as unknown as AdminSession;
  if (now >= d.createdAt + memberConfig.ttl.sessionAbsolute * 1000) {
    await kv.delete(k);
    return null;
  }
  if (now - d.lastSeen > 60_000) {
    d.lastSeen = now;
    await kv.put({ ...k, entityType: 'admin_session', data: { ...d }, ttl: expiryFor(d.createdAt, now) });
  }
  return d;
}

export async function destroyAdminSession(kv: Kv, token: string | undefined): Promise<void> {
  if (token) await kv.delete(sessionKey(token));
}

// ---- cookies -------------------------------------------------------------------------------------

const sessionCookie = (production: boolean) => (production ? '__Host-rnc_admin' : 'rnc_admin');
const base = () => ({ path: '/', httpOnly: true, secure: isProduction(), sameSite: 'lax' as const });

export const adminToken = (c: AstroCookies) => c.get(sessionCookie(isProduction()))?.value;
export const setAdminCookie = (c: AstroCookies, token: string) =>
  c.set(sessionCookie(isProduction()), token, { ...base(), maxAge: memberConfig.ttl.sessionAbsolute });
export const clearAdminCookie = (c: AstroCookies) => c.delete(sessionCookie(isProduction()), { path: '/' });
