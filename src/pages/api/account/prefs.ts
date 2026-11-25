import type { APIRoute } from 'astro';
import { signupConfig } from '../../../lib/signup/config';
import { audit } from '../../../lib/members/audit';
import { announce } from '../../../lib/notify';
import { postContext, see } from '../../../lib/members/guard';
import { finishResubscribe, type ResubscribeOutcome } from '../../../lib/members/resubscribe';

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

  let resubscribe: ResubscribeOutcome | null = null;
  try {
    const fields: string[] = [];
    if (unsubscribeAll) {
      if (!person.unsubscribed) {
        // Untick the three email choices too (printed mail has its own options and is left alone), so the form shows
        // nothing ticked; they tick again what they want if they come back.
        await people.setLists(personId, [], managed);
        await people.setUnsubscribed(personId, true);
        fields.push('unsubscribed from all email');
      }
    } else {
      const changes = await people.setLists(personId, selected, managed);
      if (changes.length) fields.push('mailing preferences');
      if (person.unsubscribed && selected.length) {
        // Untick Unsubscribed, then ask Mailchimp for its confirmation email straight away and clear the date.
        await people.setUnsubscribed(personId, false);
        const email = (person.emails.find((e) => e.primary) ?? person.emails[0])?.address ?? '';
        resubscribe = await finishResubscribe({ people }, personId, email);
        fields.push('resubscribe requested');
      }
    }
    if (fields.length) {
      await audit(kv, personId, { action: 'preferences_updated', fields, via: 'member', ipHash: ip });
      await announce('preferences_updated', `${person.firstName} ${person.lastName}`.trim(), fields.join(', '));
      await people.addNote(personId, `Changed mailing preferences through the website (${fields.join(', ')}).`).catch(() => {});
    }
  } catch (err) {
    console.error('[members] prefs failed', err instanceof Error ? err.message : err);
    return see('/account/details?error=save#mail');
  }
  const result = unsubscribeAll ? 'unsubscribed=1' : resubscribe === 'requested' ? 'resubscribed=1' : 'saved=1';
  return see(`/account/details?${result}#mail`);
};
