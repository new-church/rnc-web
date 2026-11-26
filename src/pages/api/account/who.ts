import type { APIRoute } from 'astro';
import { csrfOk, setSessionPerson } from '../../../lib/members/session';
import { memberContext, see } from '../../../lib/members/guard';

export const prerender = false;

/** Several people share the email address: the person picks who they are from the list the session holds. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const ctx = await memberContext(cookies);
  if (!ctx) return see('/login');
  const form = await request.formData();
  if (!csrfOk(ctx.session, form.get('csrf'))) return see('/account/who?error=csrf');
  try {
    await setSessionPerson(ctx.kv, ctx.token, String(form.get('person') ?? ''));
  } catch {
    return see('/account/who?error=pick');
  }
  return see('/account/details');
};
