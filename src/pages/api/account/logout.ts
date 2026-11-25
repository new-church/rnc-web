import type { APIRoute } from 'astro';
import { csrfOk } from '../../../lib/members/session';
import { memberContext, see } from '../../../lib/members/guard';
import { signOutEverywhere } from '../../../lib/members/sign-in';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const ctx = await memberContext(cookies);
  if (ctx) {
    const form = await request.formData();
    if (!csrfOk(ctx.session, form.get('csrf'))) return see('/account/details?error=csrf');
  }
  await signOutEverywhere(cookies);
  return see('/account?signedout=1');
};
