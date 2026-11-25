/**
 * Finishing a resubscribe straight away, instead of leaving it for the nightly sync.
 *
 * When someone ticks a list again, the website clears the Unsubscribed flag in Planning Center. Mailchimp may still have
 * them as unsubscribed, and only Mailchimp's own confirmation email can bring them back. The sync does that overnight
 * (it reads "flag cleared, date kept" as a request). Here we do the same thing at once, then remove the
 * "Unsubscribed on" date, so Planning Center is clean immediately and no old date is left to confuse a later unsubscribe.
 *
 * If Mailchimp can't be reached the date is left in place and the nightly sync finishes the job as before.
 */
import { isLive } from '../signup';
import { Mailchimp } from '../sync/mailchimp';
import type { PeopleApi } from './people';

export type McLike = { status(email: string): Promise<string | null>; requestResubscribe(email: string): Promise<unknown> };
export type ResubscribeOutcome =
  /** Mailchimp had them unsubscribed: it is now emailing them a confirmation. */
  | 'requested'
  /** Nothing to ask Mailchimp (already subscribed, pending, or not in the audience): the date is cleared. */
  | 'cleared'
  /** Left for the nightly sync (not live, or Mailchimp failed). */
  | 'deferred';

export async function finishResubscribe(
  deps: { people: Pick<PeopleApi, 'clearUnsubscribedOn'>; mc?: McLike | null },
  personId: string,
  email: string,
): Promise<ResubscribeOutcome> {
  const mc = deps.mc === undefined ? (isLive() ? Mailchimp.fromEnv() : null) : deps.mc;
  if (!mc || !email) return 'deferred';

  let outcome: ResubscribeOutcome;
  try {
    if ((await mc.status(email)) === 'unsubscribed') {
      await mc.requestResubscribe(email);
      outcome = 'requested';
    } else {
      outcome = 'cleared';
    }
  } catch (err) {
    console.error('[members] Mailchimp resubscribe failed; the nightly sync will finish it', err instanceof Error ? err.message : err);
    return 'deferred';
  }
  try {
    await deps.people.clearUnsubscribedOn(personId);
  } catch (err) {
    console.error('[members] could not clear the Unsubscribed on date', err instanceof Error ? err.message : err);
  }
  return outcome;
}
