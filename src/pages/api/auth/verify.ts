import type { APIRoute } from "astro";
import { verifyLogin } from "../../../lib/members/auth";
import { loginEmail } from "../../../lib/members/session";
import { finishSignIn, signInDeps } from "../../../lib/members/sign-in";
import { verifyTurnstile } from "../../../lib/signup";

export const prerender = false;

const see = (to: string) => new Response(null, { status: 303, headers: { Location: to } });

/** Sign-in step 2 from /login: the code from the email. Administrators land in the admin area. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const email = loginEmail(cookies);
  if (!email) return see("/login?error=expired");
  const form = await request.formData();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), clientAddress))) return see("/login/code?error=check");
  const r = await verifyLogin(signInDeps(), email, String(form.get("code") ?? ""), clientAddress);
  if (!r.ok) return see("/login/code?error=code");
  return see(finishSignIn(cookies, r, "login"));
};
