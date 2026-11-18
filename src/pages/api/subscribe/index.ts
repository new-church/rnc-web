import type { APIRoute } from 'astro';
import { signupConfig } from '../../../lib/signup/config';
import { alertStaff } from '../../../lib/signup/alert';
import { isProduction, parseForm, signupPath, sendConfirmation, signToken, verifyTurnstile } from '../../../lib/signup';

export const prerender = false;

const back = (q: string) => new Response(null, { status: 303, headers: { Location: `${signupPath()}?${q}` } });

/** Step 1: check Turnstile, then email a confirmation link. Always answers the same way for any valid address. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData();

  const parsed = parseForm(form);
  if (!parsed.ok) return back('error=invalid');

  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return back('error=check');

  const origin = isProduction() ? signupConfig.siteUrl : new URL(request.url).origin;
  const link = `${origin}${signupPath('/confirm')}?t=${encodeURIComponent(signToken(parsed.value))}`;
  try {
    await sendConfirmation(parsed.value, link);
  } catch (err) {
    console.error('[signup] confirmation email failed', err);
    await alertStaff('problem', 'a confirmation email could not be sent', [
      `Someone tried to subscribe as ${parsed.value.first} ${parsed.value.last} <${parsed.value.email}> but the confirmation email failed.`,
      `Error: ${String((err as Error).message ?? err).slice(0, 300)}`,
    ]);
    return back('error=send');
  }
  return back('sent=1');
};
