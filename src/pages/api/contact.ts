import type { APIRoute } from 'astro';
import { contactErrors, parseEnquiry, sendEnquiry } from '../../lib/contact';
import { formAnswer } from '../../lib/form-response';
import { verifyTurnstile } from '../../lib/signup';
import { alertStaff } from '../../lib/signup/alert';
import { memberConfig } from '../../lib/members/config';
import { ipHash } from '../../lib/members/crypto';
import { memberKv } from '../../lib/members/kv';
import { withinLimit } from '../../lib/members/rate';

export const prerender = false;

const back = (q: string) => `/contact?${q}#enquiry`;

/** The general enquiry form: Turnstile check, then email to the church office. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData();

  const parsed = parseEnquiry(form);
  if (!parsed.ok) return formAnswer(request, { ok: false, redirect: back('error=invalid'), message: contactErrors.invalid });

  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return formAnswer(request, { ok: false, redirect: back('error=check'), message: contactErrors.check, status: 403 });
  if (!(await withinLimit(memberKv(), 'contact-ip', ipHash(clientAddress), memberConfig.rate.contactPerIp))) return formAnswer(request, { ok: false, redirect: back('error=limit'), message: contactErrors.limit, status: 429 });

  try {
    await sendEnquiry(parsed.value);
  } catch (err) {
    console.error('[contact] enquiry email failed', err);
    const e = parsed.value;
    await alertStaff(
      'problem',
      'a contact-form message could not be sent',
      [
        `${e.name} <${e.email}> used the contact form but the message did not reach the office. Please reply to them.`,
        `Subject: ${e.subject || '(none)'}`,
        '',
        e.message,
        '',
        `Error: ${String((err as Error).message ?? err).slice(0, 300)}`,
      ],
      ['A contact-form message could not be sent. Check the alerts email for the message, and check Postmark.'],
    );
    return formAnswer(request, { ok: false, redirect: back('error=send'), message: contactErrors.send, status: 502 });
  }
  return formAnswer(request, { ok: true, redirect: back('sent=1') });
};
