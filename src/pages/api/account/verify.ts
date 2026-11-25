import type { APIRoute } from 'astro';
import { memberKv } from '../../../lib/members/kv';
import { verifyLogin } from '../../../lib/members/auth';
import { peopleApi } from '../../../lib/members/people';
import { clearLoginEmail, loginEmail, setSessionCookie } from '../../../lib/members/session';
import { see } from '../../../lib/members/guard';

export const prerender = false;

/** Step 2 of sign-in: the code from the email. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const email = loginEmail(cookies);
  if (!email) return see('/account?error=expired');
  const form = await request.formData();
  const r = await verifyLogin({ kv: memberKv(), people: peopleApi() }, email, String(form.get('code') ?? ''), clientAddress);
  if (!r.ok) return see('/account/code?error=code');
  clearLoginEmail(cookies);
  setSessionCookie(cookies, r.token);
  return see(r.needsChoice ? '/account/who' : '/account/details');
};
