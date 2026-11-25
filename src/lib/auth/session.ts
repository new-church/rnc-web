import type { AstroCookies } from "astro";
import { memberKv } from "../members/kv";
import { adminToken, readAdminSession } from "./admin-session";
import { type AppUser, getAppUserByEmail, userHasAdminAccess } from "./users";

export type SessionContext = {
  email: string;
  appUser: AppUser;
};

/**
 * The signed-in admin behind the cookie, or null. The USER# row is read on every request, so taking someone's admin
 * scope away (or deleting them) ends their access immediately.
 */
export async function getSessionContext(
  opts: { cookies: AstroCookies },
  deps: { findUser?: (email: string) => Promise<AppUser | null> } = {},
): Promise<SessionContext | null> {
  const session = await readAdminSession(memberKv(), adminToken(opts.cookies));
  if (!session) return null;
  const appUser = await (deps.findUser ?? getAppUserByEmail)(session.email);
  if (!appUser || !userHasAdminAccess(appUser)) return null;
  return { email: session.email, appUser };
}

export async function requireAdminSession(opts: {
  request: Request;
  cookies: AstroCookies;
}): Promise<SessionContext | Response> {
  const session = await getSessionContext(opts);
  if (!session) {
    return Response.redirect(new URL("/login", opts.request.url), 302);
  }
  return session;
}
