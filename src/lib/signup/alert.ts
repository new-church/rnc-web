/**
 * Staff alerts by email (Postmark): new subscribers, and problems with the signup flow.
 *
 * Recipients: ALERT_EMAIL_TO (comma separated, set in Vercel) or, if that is not set, the site's own monitored
 * address from config.ts. Alerts never throw: a failed alert must not break a signup. Outside production they are
 * logged instead of sent (SIGNUP_LIVE=1 overrides, as for the signup emails).
 *
 * Problems (not new-subscriber notices) are also posted to a Microsoft Teams channel, so someone can act quickly:
 * set TEAMS_ALERT_WEBHOOK to the URL of a Teams Workflow ("Send webhook alerts to a channel"). Subscriber details
 * are never sent to Teams; the problem email to staff carries them instead.
 * This file is duplicated in rnc-web and sc-www; only config.ts differs.
 */
import { signupConfig } from './config';
import { isLive } from './index';

type Kind = 'subscriber' | 'problem';

function env(name: string): string | undefined {
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return meta?.[name] || process.env[name] || undefined;
}

export async function alertStaff(kind: Kind, subject: string, lines: string[], teamsLines?: string[]): Promise<void> {
  const tag = kind === 'problem' ? 'PROBLEM' : 'New subscriber';
  const fullSubject = `[${signupConfig.siteName}] ${tag}: ${subject}`;
  const text = [...lines, '', `Sent automatically by the ${signupConfig.siteName} website.`].join('\n');

  if (!isLive()) {
    console.log(`[alert] (not sent: not live) ${fullSubject}\n${text}`);
    return;
  }
  if (kind === 'problem') await postToTeams(subject, teamsLines ?? []);
  try {
    const token = env('POSTMARK_TOKEN') ?? env('POSTMARK_SERVER_TOKEN');
    if (!token) throw new Error('Missing POSTMARK_TOKEN');
    const to = (env('ALERT_EMAIL_TO') ?? signupConfig.alertTo)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(',');
    const r = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        From: signupConfig.from,
        To: to,
        Subject: fullSubject,
        TextBody: text,
        MessageStream: env('POSTMARK_MESSAGE_STREAM') ?? 'outbound',
      }),
    });
    if (!r.ok) throw new Error(`Postmark ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } catch (err) {
    console.error('[alert] could not send staff alert', err);
  }
}

/** Posts an adaptive card to the Teams channel behind TEAMS_ALERT_WEBHOOK. Never throws. */
async function postToTeams(subject: string, lines: string[]): Promise<void> {
  const url = env('TEAMS_ALERT_WEBHOOK');
  if (!url) return;
  try {
    const card = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: `${signupConfig.siteName} website: problem`, weight: 'Bolder', color: 'Attention', size: 'Medium', wrap: true },
              { type: 'TextBlock', text: subject, weight: 'Bolder', wrap: true },
              ...lines.map((text) => ({ type: 'TextBlock', text, wrap: true, spacing: 'Small' })),
              { type: 'TextBlock', text: 'Details are in the email to the alerts group.', isSubtle: true, wrap: true, spacing: 'Small' },
            ],
          },
        },
      ],
    };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
    if (!r.ok) throw new Error(`Teams ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } catch (err) {
    console.error('[alert] could not post to Teams', err);
  }
}
