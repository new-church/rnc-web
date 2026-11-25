/**
 * One sign-in for everything: the same emailed code opens a member session (if an active person has the address) and an
 * admin session (if the address belongs to an administrator). The endpoints for /account and /login both use this.
 */
import type { AstroCookies } from 'astro';
import { adminToken, clearAdminCookie, destroyAdminSession, setAdminCookie } from '../auth/admin-session';
import { getAppUserByEmail, userHasAdminAccess } from '../auth/users';
import { memberKv } from './kv';
import { peopleApi } from './people';
import type { VerifyResult } from './auth';
import {
  clearLoginEmail,
  clearSessionCookie,
  clearSignedInMarker,
  destroySession,
  sessionToken,
  setSessionCookie,
  setSignedInMarker,
} from './session';

export const signInDeps = () => ({
  kv: memberKv(),
  people: peopleApi(),
  isAdmin: async (email: string) => userHasAdminAccess(await getAppUserByEmail(email)),
});

/**
 * Sets the cookies for a successful sign-in and says where to go: the admin area if you came in at /login and are an
 * admin, otherwise your details page (or "who are you?" when an address is shared).
 */
export function finishSignIn(cookies: AstroCookies, r: Extract<VerifyResult, { ok: true }>, via: 'account' | 'login'): string {
  clearLoginEmail(cookies);
  if (r.member) setSessionCookie(cookies, r.member.token);
  if (r.admin) setAdminCookie(cookies, r.admin.token);
  setSignedInMarker(cookies);
  if (r.admin && (via === 'login' || !r.member)) return '/admin/actions';
  return r.member?.needsChoice ? '/account/who' : '/account/details';
}

/** Ends every session this browser has (member and admin) and clears the cookies. */
export async function signOutEverywhere(cookies: AstroCookies): Promise<void> {
  const kv = memberKv();
  await destroySession(kv, sessionToken(cookies));
  await destroyAdminSession(kv, adminToken(cookies));
  clearSessionCookie(cookies);
  clearAdminCookie(cookies);
  clearSignedInMarker(cookies);
}
