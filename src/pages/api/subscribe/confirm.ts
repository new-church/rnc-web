import type { APIRoute } from 'astro';
import { listsFor, readToken, signupPath, subscribeInPlanningCenter } from '../../../lib/signup';
import { alertStaff } from '../../../lib/signup/alert';

export const prerender = false;

const go = (suffix: string, query = '') => new Response(null, { status: 303, headers: { Location: `${signupPath(suffix)}${query}` } });

/** Step 2: the person pressed Confirm on the page the email linked to. */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const token = String(form.get('t') ?? '');
  const sub = readToken(token);
  if (!sub) return go('/confirm', '?error=expired');
  let result;
  try {
    result = await subscribeInPlanningCenter(sub);
  } catch (err) {
    console.error('[signup] Planning Center write failed', err);
    await alertStaff('problem', 'a signup could not be saved in Planning Center', [
      `${sub.first} ${sub.last} <${sub.email}> confirmed their subscription but it was not saved. Please add them by hand.`,
      `Lists: ${listsFor(sub.lists).map((l) => l.label).join(', ')}`,
      `Error: ${String((err as Error).message ?? err).slice(0, 300)}`,
    ], ['A confirmed signup could not be saved in Planning Center. Someone needs to add them by hand.']);
    return go('/confirm', `?error=failed&t=${encodeURIComponent(token)}`);
  }
  await alertStaff('subscriber', `${sub.first} ${sub.last}`, [
    `${sub.first} ${sub.last} <${sub.email}> confirmed their subscription.`,
    `Lists: ${listsFor(sub.lists).map((l) => l.label).join(', ')}`,
    result.created ? 'They are new to Planning Center.' : 'They were already in Planning Center.',
    ...(result.resubscribed ? ['They had unsubscribed before: this clears the flag, and the next Mailchimp sync will ask them to resubscribe.'] : []),
  ]);
  return go('/confirmed');
};
