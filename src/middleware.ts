import { defineMiddleware } from "astro:middleware";
import { requireAdminSession } from "./lib/auth/session";

const isAdminArea = (path: string) =>
  path === "/admin" ||
  path.startsWith("/admin/") ||
  path.startsWith("/api/admin/") ||
  path === "/login" ||
  path.startsWith("/login/") ||
  path.startsWith("/api/auth/");

/** Personal or privileged pages are never cached, and no referrer leaves the site from them. */
async function noStore(next: () => Promise<Response>): Promise<Response> {
  const response = await next();
  try {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "same-origin");
  } catch {
    // immutable response: leave it
  }
  return response;
}

/**
 * Gate /admin/* and /api/admin/* to signed-in administrators (our own emailed-code sessions, lib/auth), and keep the
 * member and admin pages out of caches.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Member self-service pages hold personal details.
  if (path === "/account" || path.startsWith("/account/") || path.startsWith("/api/account/")) {
    return noStore(next);
  }

  if (!isAdminArea(path)) {
    return next();
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    const gate = await requireAdminSession({ request: context.request, cookies: context.cookies });
    if (gate instanceof Response) return gate;
    context.locals.adminSession = gate;
  }

  if (path.startsWith("/api/admin/")) {
    const gate = await requireAdminSession({ request: context.request, cookies: context.cookies });
    if (gate instanceof Response) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    context.locals.adminSession = gate;
  }

  return noStore(next);
});
