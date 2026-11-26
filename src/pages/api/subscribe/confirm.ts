import type { APIRoute } from 'astro';
import { verifyTurnstile } from '../../../lib/signup';
import { announce } from '../../../lib/notify';
import { memberConfig } from '../../../lib/members/config';
import { ipHash } from '../../../lib/members/crypto';
import { withinLimit } from '../../../lib/members/rate';
import { listsFor, readToken, signupPath, subscribeInPlanningCenter } from '../../../lib/signup';
import { alertStaff } from '../../../lib/signup/alert';
import { memberKv } from '../../../lib/members/kv';
import { audit } from '../../../lib/members/audit';
import { peopleApi } from '../../../lib/members/people';
import { finishResubscribe } from '../../../lib/members/resubscribe';
import { deleteSignup, readSignup, type SignupData } from '../../../lib/members/signup';

export const prerender = false;

const go = (suffix: string, query = '') => new Response(null, { status: 303, headers: { Location: `${signupPath(suffix)}${query}` } });

/** Step 2: the person pressed Confirm on the page the email linked to. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData();
  const ref = String(form.get('s') ?? '');
  const legacy = String(form.get('t') ?? '');
  const kv = memberKv();
  const param0 = ref ? `s=${encodeURIComponent(ref)}` : `t=${encodeURIComponent(legacy)}`;
  if (!(await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress))) return go('/confirm', `?error=check&${param0}`);
  if (!(await withinLimit(kv, 'confirm-ip', ipHash(clientAddress), memberConfig.rate.confirmPerIp))) return go('/confirm', `?error=limit&${param0}`);

  let sub: SignupData | null = null;
  if (ref) sub = await readSignup(kv, ref);
  else if (legacy) {
    // Links emailed before the stored-signup change carry a signed token; they still work for their 7 days.
    const old = readToken(legacy);
    sub = old && { ...old, extra: {} };
  }
  if (!sub) return go('/confirm', '?error=expired');
  const param = ref ? `s=${encodeURIComponent(ref)}` : `t=${encodeURIComponent(legacy)}`;

  let result: { created: boolean; resubscribed: boolean; inactive?: boolean; personId?: string };
  try {
    result = ref ? await peopleApi().subscribe(sub) : await subscribeInPlanningCenter(sub);
  } catch (err) {
    console.error('[signup] Planning Center write failed', err);
    await alertStaff('problem', 'a signup could not be saved in Planning Center', [
      `${sub.first} ${sub.last} <${sub.email}> confirmed their subscription but it was not saved. Please add them by hand.`,
      `Lists: ${listsFor(sub.lists).map((l) => l.label).join(', ')}`,
      `Error: ${String((err as Error).message ?? err).slice(0, 300)}`,
    ], ['A confirmed signup could not be saved in Planning Center. Someone needs to add them by hand.']);
    return go('/confirm', `?error=failed&${param}`);
  }

  let resubscribeNote = 'They had unsubscribed before: this clears the flag, and the next Mailchimp sync will ask them to resubscribe.';
  if (ref && result.resubscribed && result.personId) {
    const outcome = await finishResubscribe({ people: peopleApi() }, result.personId, sub.email);
    resubscribeNote =
      outcome === 'requested'
        ? 'They had unsubscribed before: Mailchimp is now emailing them a confirmation.'
        : outcome === 'cleared'
          ? 'They had unsubscribed before; they are already back on the list in Mailchimp.'
          : resubscribeNote;
  }
  if (ref) await deleteSignup(kv, ref);
  if (result.personId) await audit(kv, result.personId, { action: 'signup_confirmed', via: 'signup' });
  if (result.personId && !result.inactive) await announce('signup_confirmed', `${sub.first} ${sub.last}`.trim());
  if (result.personId && !result.inactive && sub.source) {
    // Best effort: a failure here must not spoil a confirmed signup.
    try {
      const people = peopleApi();
      const wrote = await people.setSource(result.personId, sub.source);
      await people.addNote(result.personId, `Joined the mailing list through the website. How they heard about us: ${sub.source}.${wrote ? '' : ' (Planning Center has no "How they heard about us" field yet, so this note is the only record.)'}`);
    } catch (err) {
      console.error('[signup] could not record how they heard about us', err instanceof Error ? err.message : err);
    }
  }

  if (result.inactive) {
    await alertStaff('problem', 'a deactivated person asked to subscribe again', [
      `${sub.first} ${sub.last} <${sub.email}> is deactivated in Planning Center and confirmed a new subscription. They were NOT reactivated.`,
      'If they should come back, set them active in Planning Center and untick Unsubscribed.',
    ], ['A deactivated person asked to subscribe again. They were not reactivated; see the email.']);
    return go('/confirmed');
  }

  await alertStaff('subscriber', `${sub.first} ${sub.last}`, [
    `${sub.first} ${sub.last} <${sub.email}> confirmed their subscription.`,
    `Lists: ${listsFor(sub.lists).map((l) => l.label).join(', ')}`,
    ...(sub.source ? [`How they heard about us: ${sub.source}`] : []),
    result.created ? 'They are new to Planning Center.' : 'They were already in Planning Center.',
    ...(result.resubscribed ? [resubscribeNote] : []),
  ]);
  return go('/confirmed');
};
