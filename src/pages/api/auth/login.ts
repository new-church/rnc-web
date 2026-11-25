import type { APIRoute } from "astro";
import { startLogin } from "../../../lib/members/auth";
import { setLoginEmail } from "../../../lib/members/session";
import { signInDeps } from "../../../lib/members/sign-in";
import { normaliseEmail } from "../../../lib/members/validate";
import { verifyTurnstile } from "../../../lib/signup";

export const prerender = false;

const see = (to: string) => new Response(null, { status: 303, headers: { Location: to } });

/** Sign-in step 1 from /login: robot check, then a code by email. Answers the same whoever the address belongs to. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const form = await request.formData();
  const email = normaliseEmail(String(form.get("email") ?? ""));
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), clientAddress))) return see("/login?error=check");
  const r = await startLogin(signInDeps(), email, clientAddress);
  if (!r.ok) return see("/login?error=invalid");
  setLoginEmail(cookies, email);
  return see("/login/code");
};
