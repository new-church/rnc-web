import { env } from '../env';
import { randomToken } from '../members/crypto';
import { isLive } from '../signup';
import { signupConfig } from '../signup/config';

/**
 * Visibility for the committee: one Microsoft Teams message and one Google Analytics 4 event for each thing a person
 * does in the member area (and each decision the Secretary records).
 *
 * Teams gets the person's name and what they did, never an email address, phone number, address or any value they
 * changed. Analytics gets the event name only, with a throwaway client id, so nothing in it identifies anyone.
 * Both are best effort: they never throw and never hold up the person's request.
 */

export type MemberEvent =
  | 'membership_applied'
  | 'resignation_requested'
  | 'request_withdrawn'
  | 'account_deactivated'
  | 'details_updated'
  | 'preferences_updated'
  | 'signup_confirmed'
  | 'membership_approved'
  | 'membership_declined'
  | 'resignation_recorded'
  | 'signed_in';

type Info = { title: string; text: (name: string, extra?: string) => string; link?: string; needsAction?: boolean; compact?: boolean };

const admin = `${signupConfig.siteUrl}/admin/membership`;

const info: Record<MemberEvent, Info> = {
  membership_applied: {
    title: 'Membership application',
    text: (n, x) => `${n} has asked to become a member${x ? ` (${x})` : ''}. The Committee needs to consider it at its next meeting.`,
    link: admin,
    needsAction: true,
  },
  resignation_requested: {
    title: 'Resignation request',
    text: (n, x) => `${n} has asked to resign as a member${x ? ` (${x})` : ''}. The Committee needs to consider it at its next meeting.`,
    link: admin,
    needsAction: true,
  },
  request_withdrawn: { title: 'Request withdrawn', text: (n, x) => `${n} withdrew their ${x || 'request'}.` },
  account_deactivated: { title: 'Account deactivated', text: (n) => `${n} deactivated their account (set inactive and unsubscribed).` },
  details_updated: { title: 'Details updated', text: (n, x) => `${n} updated their own details${x ? `: ${x}` : ''}.` },
  preferences_updated: { title: 'Mailing preferences changed', text: (n, x) => `${n} changed their mailing preferences${x ? `: ${x}` : ''}.` },
  signup_confirmed: { title: 'New subscriber', text: (n) => `${n} confirmed a mailing list signup.` },
  membership_approved: { title: 'Member admitted', text: (n, x) => `${n} was admitted as a member${x ? `, recorded by ${x}` : ''}.`, link: admin },
  membership_declined: { title: 'Application declined', text: (n, x) => `${n}'s membership application was declined${x ? `, recorded by ${x}` : ''}.`, link: admin },
  signed_in: { title: 'Signed in', text: (n, x) => `${n} signed in${x ? ` (${x})` : ''}.`, compact: true },
  resignation_recorded: { title: 'Resignation recorded', text: (n, x) => `${n}'s resignation was recorded${x ? ` by ${x}` : ''}. They are now a friend.`, link: admin },
};

/** The Adaptive Card that a Teams "Workflows" webhook expects. */
export function teamsCard(event: MemberEvent, name: string, extra?: string) {
  const i = info[event];
  // A sign-in is just for information, so it is one quiet line, not a card with a heading.
  if (i.compact) {
    return {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [{ type: 'TextBlock', text: i.text(name || 'Someone', extra), size: 'Small', isSubtle: true, wrap: true }],
        },
      }],
    };
  }
  const body: unknown[] = [
    { type: 'TextBlock', text: i.title, weight: 'Bolder', size: 'Medium', wrap: true, color: i.needsAction ? 'Attention' : 'Default' },
    { type: 'TextBlock', text: i.text(name || 'Someone', extra), wrap: true },
  ];
  const content: Record<string, unknown> = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body,
  };
  if (i.link) content.actions = [{ type: 'Action.OpenUrl', title: 'Open the membership page', url: i.link }];
  return { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content }] };
}

async function post(url: string, body: unknown, label: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error(`[notify] ${label} answered ${res.status}`);
  } catch (err) {
    console.error(`[notify] ${label} failed`, err instanceof Error ? err.message : err);
  }
}

/**
 * Sends one GA4 event from the server (Measurement Protocol), live site only. Pass the visitor's `_ga`
 * cookie when there is one so the event joins their session; otherwise it counts as a new client.
 * `params` must hold no personal details.
 */
export async function trackServerEvent(name: string, params: Record<string, string | number>, gaCookie?: string): Promise<void> {
  const secret = env('GA4_API_SECRET');
  if (!secret || process.env.VERCEL_ENV !== 'production') return;
  // _ga looks like GA1.1.<random>.<timestamp>; GA's client_id is the last two parts.
  const fromCookie = gaCookie?.match(/^GA\d\.\d\.(\d+\.\d+)$/)?.[1];
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=G-WQG7KKW8M5&api_secret=${encodeURIComponent(secret)}`;
  await post(url, { client_id: fromCookie ?? `server.${randomToken(8)}`, events: [{ name, params: { engagement_time_msec: 1, ...params } }] }, 'Analytics');
}

/** Tells the committee (Teams) and Analytics. `extra` must hold no personal details: field names, a label, a role. */
export async function announce(event: MemberEvent, name: string, extra?: string): Promise<void> {
  // The same Teams channel as the signup alerts (TEAMS_ALERT_WEBHOOK), and like them only when live.
  const teams = env('TEAMS_ALERT_WEBHOOK');
  const jobs: Promise<void>[] = [];
  if (isLive() && teams?.startsWith('https://')) jobs.push(post(teams, teamsCard(event, name, extra), 'Teams'));

  // Analytics only from the live site, so local and preview use never count.
  const secret = env('GA4_API_SECRET');
  if (secret && process.env.VERCEL_ENV === 'production') {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=G-WQG7KKW8M5&api_secret=${encodeURIComponent(secret)}`;
    jobs.push(post(url, { client_id: `server.${randomToken(8)}`, events: [{ name: `rnc_${event}`, params: { engagement_time_msec: 1 } }] }, 'Analytics'));
  }
  await Promise.all(jobs);
}
