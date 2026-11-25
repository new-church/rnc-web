import type { APIRoute } from 'astro';
import { verifyLogin } from '../../../lib/members/auth';
import { see } from '../../../lib/members/guard';
import { announce } from '../../../lib/notify';
import { finishSignIn, signInDeps } from '../../../lib/members/sign-in';
import { loginEmail } from '../../../lib/members/session';
import { verifyTurnstile } from '../../../lib/signup';

export const prerender = false;

/** Step 2 of sign-in from /account: robot check, then the code from the email (it also opens the admin area for administrators). */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const email = loginEmail(cookies);
  if (!email) return see('/account?error=expired');
  const form = await request.formData();
  if (!(await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress))) return see('/account/code?error=check');
  const r = await verifyLogin(signInDeps(), email, String(form.get('code') ?? ''), clientAddress);
  if (!r.ok) return see('/account/code?error=code');
  const to = finishSignIn(cookies, r, 'account');
  await announce('signed_in', r.who, r.admin ? 'administrator' : undefined);
  return see(to);
};
