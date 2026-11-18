/**
 * The general enquiry form on /contact: validated, Turnstile-checked on the server, then emailed (Postmark) to the
 * church office with the visitor as Reply-To, so staff can just press reply. Outside production the message is
 * logged instead of sent (SIGNUP_LIVE=1 overrides, as for the signup emails).
 */
import { signupConfig } from './signup/config';
import { isLive } from './signup';

export type Enquiry = { name: string; email: string; subject: string; message: string };

function env(name: string): string | undefined {
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return meta?.[name] || process.env[name] || undefined;
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function parseEnquiry(form: FormData): { ok: true; value: Enquiry } | { ok: false } {
  const text = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const name = oneLine(text('name', 100));
  const email = oneLine(text('email', 200)).toLowerCase();
  const subject = oneLine(text('subject', 150));
  const message = text('message', 5000);
  const emailOk = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email);
  if (!name || !emailOk || !message) return { ok: false };
  return { ok: true, value: { name, email, subject, message } };
}

export async function sendEnquiry(e: Enquiry): Promise<void> {
  const subject = `Website enquiry: ${e.subject || 'New message'}`;
  const text = [`From: ${e.name} <${e.email}>`, e.subject ? `Subject: ${e.subject}` : '', '', e.message, '', 'Sent from the contact form on the Roseville New Church website. Reply to this email to answer them.']
    .filter((l, i) => l !== '' || i > 1)
    .join('\n');

  if (!isLive()) {
    console.log(`[contact] (not sent: not live) to ${signupConfig.contactTo}\n${subject}\n${text}`);
    return;
  }
  const token = env('POSTMARK_TOKEN') ?? env('POSTMARK_SERVER_TOKEN');
  if (!token) throw new Error('Missing POSTMARK_TOKEN');
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'X-Postmark-Server-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      From: signupConfig.from,
      To: signupConfig.contactTo,
      ReplyTo: `${e.name.replace(/[<>",]/g, '')} <${e.email}>`,
      Subject: subject,
      TextBody: text,
      Tag: 'contact-form',
      MessageStream: env('POSTMARK_MESSAGE_STREAM') ?? 'outbound',
    }),
  });
  if (!r.ok) throw new Error(`Postmark ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
