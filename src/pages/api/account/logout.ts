import type { APIRoute } from 'astro';
import { csrfOk, clearSessionCookie, destroySession } from '../../../lib/members/session';
import { memberContext, see } from '../../../lib/members/guard';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const ctx = await memberContext(cookies);
  if (ctx) {
    const form = await request.formData();
    if (csrfOk(ctx.session, form.get('csrf'))) await destroySession(ctx.kv, ctx.token);
  }
  clearSessionCookie(cookies);
  return see('/account?signedout=1');
};
