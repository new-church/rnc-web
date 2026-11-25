import type { APIRoute } from 'astro';
import { memberConfig } from '../../../lib/members/config';
import { applyForMembership, requestResignation, withdrawRequest } from '../../../lib/members/membership';
import { postContext, see } from '../../../lib/members/guard';

export const prerender = false;

/** Apply, request resignation, or withdraw a request. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ctx = await postContext(request, cookies, clientAddress);
  if ('redirect' in ctx) return see(ctx.redirect);
  const { form, kv, people, personId, session, ip } = ctx;
  const deps = { kv, people };
  const who = { personId, email: session.email };
  const action = String(form.get('action') ?? '');
  const fail = (m: string) => see(`/account/membership?error=${encodeURIComponent(m)}`);

  if (action === 'apply') {
    const r = await applyForMembership(
      deps,
      who,
      { avowed: memberConfig.avowals.map((_, i) => form.get(`avow${i}`) === '1'), guarantee: form.get('guarantee') === '1', register: form.get('register') === '1' },
      ip,
    );
    return r.ok ? see('/account/membership?applied=1') : fail(r.error);
  }
  if (action === 'resign') {
    const r = await requestResignation(deps, who, false, ip);
    return r.ok ? see('/account/membership?resigned=1') : fail(r.error);
  }
  if (action === 'withdraw') {
    const r = await withdrawRequest(deps, personId, String(form.get('request') ?? ''));
    return r.ok ? see('/account/membership?withdrawn=1') : fail(r.error);
  }
  return fail('Unknown action.');
};
