import type { AstroCookies } from "astro";
import { createSupabaseServerClient } from "./supabase";
import {
  type AppUser,
  getAppUserByAuthId,
  getAppUserByEmail,
  userHasAdminAccess,
} from "./users";

export type SessionContext = {
  authUserId: string;
  email: string;
  appUser: AppUser | null;
};

export async function getSessionContext(opts: {
  request: Request;
  cookies: AstroCookies;
}): Promise<SessionContext | null> {
  const supabase = createSupabaseServerClient(opts);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const email = data.user.email;
  const authUserId = data.user.id;
  const appUser =
    (await getAppUserByAuthId(authUserId)) ||
    (await getAppUserByEmail(email));

  return { authUserId, email, appUser };
}

export async function requireAdminSession(opts: {
  request: Request;
  cookies: AstroCookies;
}): Promise<SessionContext | Response> {
  const session = await getSessionContext(opts);
  if (!session) {
    return Response.redirect(new URL("/login", opts.request.url), 302);
  }
  if (!userHasAdminAccess(session.appUser)) {
    return Response.redirect(new URL("/login?error=forbidden", opts.request.url), 302);
  }
  return session;
}
