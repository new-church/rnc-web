import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import { supabaseAnonKey, supabasePublicUrl } from "../env";

export function createSupabaseServerClient(opts: {
  request: Request;
  cookies: AstroCookies;
}) {
  return createServerClient(supabasePublicUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return parseCookieHeader(opts.request.headers.get("Cookie") ?? "").map(
          (c) => ({ name: c.name, value: c.value ?? "" }),
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          opts.cookies.set(name, value, options);
        });
      },
    },
  });
}
