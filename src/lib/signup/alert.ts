/**
 * Staff alerts.
 *
 *   - New subscriber: posted to a Microsoft Teams channel only (no email).
 *   - Problem (a confirmation email that could not be sent, a confirmed signup that could not be saved in Planning
 *     Center): emailed to staff (Postmark) AND posted to Teams, so someone can act quickly.
 *
 * Teams: TEAMS_ALERT_WEBHOOK is the URL of a Teams Workflow ("Send webhook alerts to a channel") for the private
 * Website alerts team. Email: ALERT_EMAIL_TO (comma separated, set in Vercel) or, if not set, the site's address from
 * config.ts (the alerts@ssnc.au distribution group, whose members are managed in Microsoft 365).
 *
 * Alerts never throw: a failed alert must not break a signup. Outside production they are logged instead of sent
 * (SIGNUP_LIVE=1 overrides, as for the signup emails). Subscriber names and email addresses appear in the Teams
 * channel, so keep that team limited to staff.
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
  // Subscriber updates are Teams only; problems also go by email.
  const tag = kind === 'problem' ? 'PROBLEM' : 'New subscriber';
  const fullSubject = `[${signupConfig.siteName}] ${tag}: ${subject}`;
  const text = [...lines, '', `Sent automatically by the ${signupConfig.siteName} website.`].join('\n');

  if (!isLive()) {
    console.log(`[alert] (not sent: not live) ${fullSubject}\n${text}`);
    return;
  }
  await postToTeams(kind, subject, kind === 'subscriber' ? lines : (teamsLines ?? []));
  if (kind === 'subscriber') return;
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
async function postToTeams(kind: Kind, subject: string, lines: string[]): Promise<void> {
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
              { type: 'TextBlock', text: kind === 'problem' ? `${signupConfig.siteName} website: problem` : `${signupConfig.siteName}: new subscriber`, weight: 'Bolder', color: kind === 'problem' ? 'Attention' : 'Good', size: 'Medium', wrap: true },
              ...(kind === 'problem' ? [{ type: 'TextBlock', text: subject, weight: 'Bolder', wrap: true }] : []),
              ...lines.map((text) => ({ type: 'TextBlock', text, wrap: true, spacing: 'Small' })),
              ...(kind === 'problem' ? [{ type: 'TextBlock', text: 'Details are in the email to the alerts group.', isSubtle: true, wrap: true, spacing: 'Small' }] : []),
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
