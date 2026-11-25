import type { APIRoute } from 'astro';
import { signupConfig } from '../../../lib/signup/config';
import { audit } from '../../../lib/members/audit';
import { postContext, see } from '../../../lib/members/guard';

export const prerender = false;

/** Mailing preferences and unsubscribe, through the existing Planning Center rules (see docs/sync.md). */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ctx = await postContext(request, cookies, clientAddress);
  if ('redirect' in ctx) return see(ctx.redirect);
  const { form, people, personId, kv, ip, person } = ctx;

  const unsubscribeAll = form.get('unsubscribe_all') === '1';
  const picked = new Set(form.getAll('lists').map(String));
  const selected = signupConfig.lists.filter((l) => picked.has(l.id)).map((l) => l.option);
  const managed = signupConfig.lists.map((l) => l.option);

  try {
    const fields: string[] = [];
    if (unsubscribeAll) {
      if (!person.unsubscribed) {
        await people.setUnsubscribed(personId, true);
        fields.push('unsubscribed from all email');
      }
    } else {
      const changes = await people.setLists(personId, selected, managed);
      if (changes.length) fields.push('mailing preferences');
      if (person.unsubscribed && selected.length) {
        // Untick Unsubscribed and keep its date: the daily sync turns that into a Mailchimp confirmation email.
        await people.setUnsubscribed(personId, false);
        fields.push('resubscribe requested');
      }
    }
    if (fields.length) {
      await audit(kv, personId, { action: 'preferences_updated', fields, via: 'member', ipHash: ip });
      await people.addNote(personId, `Changed mailing preferences through the website (${fields.join(', ')}).`).catch(() => {});
    }
  } catch (err) {
    console.error('[members] prefs failed', err instanceof Error ? err.message : err);
    return see('/account/details?error=save#mail');
  }
  return see(`/account/details?${unsubscribeAll ? 'unsubscribed=1' : 'saved=1'}#mail`);
};
