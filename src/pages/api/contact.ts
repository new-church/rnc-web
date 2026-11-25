import type { APIRoute } from 'astro';
import { parseEnquiry, sendEnquiry } from '../../lib/contact';
import { verifyTurnstile } from '../../lib/signup';
import { alertStaff } from '../../lib/signup/alert';
import { memberConfig } from '../../lib/members/config';
import { ipHash } from '../../lib/members/crypto';
import { memberKv } from '../../lib/members/kv';
import { withinLimit } from '../../lib/members/rate';

export const prerender = false;

const back = (q: string) => new Response(null, { status: 303, headers: { Location: `/contact?${q}#enquiry` } });

/** The general enquiry form: Turnstile check, then email to the church office. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData();

  const parsed = parseEnquiry(form);
  if (!parsed.ok) return back('error=invalid');

  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return back('error=check');
  if (!(await withinLimit(memberKv(), 'contact-ip', ipHash(clientAddress), memberConfig.rate.contactPerIp))) return back('error=limit');

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
    return back('error=send');
  }
  return back('sent=1');
};
