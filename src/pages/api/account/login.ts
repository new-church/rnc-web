import type { APIRoute } from 'astro';
import { verifyTurnstile } from '../../../lib/signup';
import { memberKv } from '../../../lib/members/kv';
import { startLogin } from '../../../lib/members/auth';
import { peopleApi } from '../../../lib/members/people';
import { setLoginEmail } from '../../../lib/members/session';
import { normaliseEmail } from '../../../lib/members/validate';
import { see } from '../../../lib/members/guard';

export const prerender = false;

/** Step 1 of sign-in: Turnstile, then a code by email (if the address is on file). Answers the same either way. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const form = await request.formData();
  const email = normaliseEmail(String(form.get('email') ?? ''));
  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return see('/account?error=check');
  const r = await startLogin({ kv: memberKv(), people: peopleApi() }, email, clientAddress);
  if (!r.ok) return see('/account?error=invalid');
  setLoginEmail(cookies, email);
  return see('/account/code');
};
