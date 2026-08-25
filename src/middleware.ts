import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/auth/supabase";

/**
 * Refresh the Auth session cookies on each request.
 * Route guards for /admin live on the pages (need app-user scopes from items).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const supabase = createSupabaseServerClient({
      request: context.request,
      cookies: context.cookies,
    });
    await supabase.auth.getUser();
  } catch {
    // Missing anon key during static builds of unrelated pages — ignore.
  }
  return next();
});
