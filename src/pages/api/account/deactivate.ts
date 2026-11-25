import type { APIRoute } from 'astro';
import { deactivateAccount, isMember, requestResignation } from '../../../lib/members/membership';
import { clearSessionCookie, destroySession } from '../../../lib/members/session';
import { postContext, see } from '../../../lib/members/guard';

export const prerender = false;

/**
 * Deactivates the account (Planning Center inactive + unsubscribed) after the person types DEACTIVATE.
 * For a member this also lodges a resignation request for the Committee.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ctx = await postContext(request, cookies, clientAddress);
  if ('redirect' in ctx) return see(ctx.redirect);
  const { form, kv, people, personId, person, session, token, ip } = ctx;
  if (String(form.get('confirm') ?? '').trim().toUpperCase() !== 'DEACTIVATE') return see('/account/leave?error=confirm');

  const deps = { kv, people };
  try {
    if (isMember(person)) {
      const r = await requestResignation(deps, { personId, email: session.email }, true, ip);
      if (!r.ok) {
        // A resignation request may already be waiting; still deactivate.
        await deactivateAccount(deps, personId, session.email, ip);
      }
    } else {
      await deactivateAccount(deps, personId, session.email, ip);
    }
  } catch (err) {
    console.error('[members] deactivate failed', err instanceof Error ? err.message : err);
    return see('/account/leave?error=save');
  }
  await destroySession(kv, token);
  clearSessionCookie(cookies);
  return see('/account/deactivated');
};
