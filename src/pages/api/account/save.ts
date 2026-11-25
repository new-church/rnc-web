import type { APIRoute } from 'astro';
import { audit } from '../../../lib/members/audit';
import { parseExtra } from '../../../lib/members/validate';
import { postContext, see } from '../../../lib/members/guard';

export const prerender = false;

/** Saves the details form. Only these fields can be changed, and only on the person in the session. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ctx = await postContext(request, cookies, clientAddress);
  if ('redirect' in ctx) return see(ctx.redirect);
  const { form, people, personId, kv, ip } = ctx;

  const first = String(form.get('first') ?? '').trim().slice(0, 80);
  const last = String(form.get('last') ?? '').trim().slice(0, 80);
  if (!first || !last) return see('/account/details?error=name');
  const extra = parseExtra(form);
  if (!extra.ok) return see(`/account/details?error=invalid&detail=${encodeURIComponent(extra.error)}`);

  try {
    const changed = await people.updateDetails(personId, { ...extra.value, firstName: first, lastName: last });
    if (changed.length) {
      await audit(kv, personId, { action: 'details_updated', fields: changed, via: 'member', ipHash: ip });
      await people.addNote(personId, `Updated their own details through the website (${changed.join(', ')}).`).catch(() => {});
    }
  } catch (err) {
    console.error('[members] save failed', err instanceof Error ? err.message : err);
    return see('/account/details?error=save');
  }
  return see('/account/details?saved=1');
};
