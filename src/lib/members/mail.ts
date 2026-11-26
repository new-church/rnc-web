import { env } from '../env';
import { signupConfig } from '../signup/config';
import { isLive } from '../signup';

export type Attachment = { name: string; content: Buffer; type: string };
export type Mail = { to: string; subject: string; text: string; replyTo?: string; attachments?: Attachment[] };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Plain text with the links made clickable; every message also goes out as text. */
function toHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#222">${esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
}

/**
 * Sends one email through Postmark. Outside production it only logs (so login codes show in the dev console),
 * unless SIGNUP_LIVE=1, as for the signup emails.
 */
export async function sendMail(m: Mail): Promise<void> {
  if (!isLive()) {
    console.log(`[members] (not sent: not live) to ${m.to}: ${m.subject}${m.attachments?.length ? ` [${m.attachments.map((a) => `${a.name} ${a.content.length} bytes`).join(', ')}]` : ''}\n${m.text}`);
    return;
  }
  const token = env('POSTMARK_TOKEN') ?? env('POSTMARK_SERVER_TOKEN');
  if (!token) throw new Error('Missing POSTMARK_TOKEN');
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'X-Postmark-Server-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      From: signupConfig.from,
      To: m.to,
      ReplyTo: m.replyTo ?? signupConfig.replyTo,
      Subject: m.subject,
      TextBody: m.text,
      HtmlBody: toHtml(m.text),
      ...(m.attachments?.length
        ? { Attachments: m.attachments.map((a) => ({ Name: a.name, Content: a.content.toString('base64'), ContentType: a.type })) }
        : {}),
      MessageStream: env('POSTMARK_MESSAGE_STREAM') ?? 'outbound',
    }),
  });
  if (!r.ok) throw new Error(`Postmark ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

const sign = `Questions? Reply to this email or phone ${signupConfig.contactPhone}.\n${signupConfig.siteName}`;

export const mails = {
  loginCode: (to: string, code: string): Mail => ({
    to,
    subject: `Your ${signupConfig.siteName} code: ${code}`,
    text: [
      `Your code is ${code}`,
      '',
      'Enter it on the website to sign in. It works once and expires in 10 minutes.',
      "If you didn't ask for this, you can ignore this email. Nobody can see your details without the code.",
      '',
      sign,
    ].join('\n'),
  }),

  applicationReceived: (to: string, first: string): Mail => ({
    to,
    subject: 'We have your membership application',
    text: [
      `Hello ${first},`,
      '',
      "Thank you for applying to become a member of The Sydney Society of The New Church. Our Committee considers applications at its next meeting, with the advice of our Minister, and we'll email you when it has decided.",
      'You can withdraw your application at any time from the "Membership" page of your details.',
      '',
      sign,
    ].join('\n'),
  }),

  notifyCommittee: (kind: 'apply' | 'resign', who: { name: string; email: string; deactivating?: boolean; message?: string }, link: string): Mail => ({
    to: '',
    subject: kind === 'apply' ? `Membership application: ${who.name}` : `Membership resignation request: ${who.name}`,
    text:
      kind === 'apply'
        ? [
            `${who.name} <${who.email}> has applied to become a member through the website.`,
            'They acknowledged the guarantee, affirmed the four beliefs in Article 4, and agreed to be on the register of members.',
            ...(who.message ? ['', 'Their message to the Committee:', who.message] : []),
            '',
            'For the Committee: a member proposes and another seconds, a majority approves having regard to the Minister’s advice, then the Secretary records the decision here:',
            link,
          ].join('\n')
        : [
            `${who.name} <${who.email}> has asked to resign as a member through the website${who.deactivating ? ', and has also deactivated their account' : ''}.`,
            ...(who.message ? ['', 'Their message to the Committee:', who.message] : []),
            '',
            'The Committee resolves resignations at its next meeting; the Secretary then records the decision here:',
            link,
          ].join('\n'),
  }),

  approved: (to: string, first: string): Mail => ({
    to,
    subject: 'Welcome as a member',
    text: [
      `Hello ${first},`,
      '',
      'The Committee has approved your application, and you are now a member of The Sydney Society of The New Church. You can vote at general meetings and be nominated for the Committee. There are no fees. You can resign at any time from your details page.',
      '',
      sign,
    ].join('\n'),
  }),

  declined: (to: string, first: string): Mail => ({
    to,
    subject: 'Your membership application',
    text: [
      `Hello ${first},`,
      '',
      "Thank you for applying. The Committee wasn't able to accept your application this time. You remain very welcome as a friend of the Society, and you can speak with our Minister or any committee member about it.",
      '',
      sign,
    ].join('\n'),
  }),

  resignationRecorded: (to: string, first: string): Mail => ({
    to,
    subject: 'Your resignation as a member',
    text: [
      `Hello ${first},`,
      '',
      "The Committee has accepted your resignation as a member of The Sydney Society of The New Church. You stay on our list as a friend unless you've chosen otherwise. Thank you for your membership.",
      '',
      sign,
    ].join('\n'),
  }),

  resignationReceived: (to: string, first: string): Mail => ({
    to,
    subject: 'We have your resignation request',
    text: [
      `Hello ${first},`,
      '',
      "We've received your request to resign as a member. Our Committee will deal with it at its next meeting, and we'll email you when it's done. You can withdraw the request until then.",
      '',
      sign,
    ].join('\n'),
  }),

  deactivated: (to: string, first: string): Mail => ({
    to,
    subject: 'Your account has been deactivated',
    text: [
      `Hello ${first},`,
      '',
      "Your account is deactivated and you won't receive our emails. Mail already queued may still arrive for up to a day. If this wasn't you, or you'd like to come back, please reply and we'll help.",
      '',
      sign,
    ].join('\n'),
  }),
};
