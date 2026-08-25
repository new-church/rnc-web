import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/auth/supabase";
import { requireAdminSession } from "./lib/auth/session";

function needsAuth(path: string): boolean {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/api/admin/") ||
    path === "/login" ||
    path.startsWith("/login/") ||
    path.startsWith("/api/auth/")
  );
}

/**
 * Refresh Auth session cookies on auth-related routes;
 * gate /admin/* and /api/admin/* to admin-scoped app users.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  if (!needsAuth(path)) {
    return next();
  }

  try {
    const supabase = createSupabaseServerClient({
      request: context.request,
      cookies: context.cookies,
    });
    await supabase.auth.getUser();
  } catch {
    // Missing anon key during builds — ignore.
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    const gate = await requireAdminSession({
      request: context.request,
      cookies: context.cookies,
    });
    if (gate instanceof Response) {
      return gate;
    }
    context.locals.adminSession = gate;
  }

  if (path.startsWith("/api/admin/")) {
    const gate = await requireAdminSession({
      request: context.request,
      cookies: context.cookies,
    });
    if (gate instanceof Response) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    context.locals.adminSession = gate;
  }

  return next();
});
