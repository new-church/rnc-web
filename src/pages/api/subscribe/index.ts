import type { APIRoute } from 'astro';
import { signupConfig } from '../../../lib/signup/config';
import { alertStaff } from '../../../lib/signup/alert';
import { isProduction, signupPath, sendConfirmation, verifyTurnstile } from '../../../lib/signup';
import { memberKv } from '../../../lib/members/kv';
import { memberConfig } from '../../../lib/members/config';
import { ipHash, sha256 } from '../../../lib/members/crypto';
import { withinLimit } from '../../../lib/members/rate';
import { createSignup, parseSignupForm } from '../../../lib/members/signup';

export const prerender = false;

const back = (q: string) => new Response(null, { status: 303, headers: { Location: `${signupPath()}?${q}` } });

/**
 * Step 1: check Turnstile, then email a confirmation link. The link holds only a random reference; the details wait
 * in the items table (7 days) until the person confirms. Always answers the same way for any valid address.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const form = await request.formData();

  const parsed = parseSignupForm(form);
  if (!parsed.ok) return back(`error=invalid&detail=${encodeURIComponent(parsed.error)}`);
  const sub = parsed.value;

  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return back('error=check');

  const kv = memberKv();
  const withinRate =
    (await withinLimit(kv, 'signup-email', sha256(sub.email).slice(0, 24), memberConfig.rate.signupPerEmail)) &&
    (await withinLimit(kv, 'signup-ip', ipHash(clientAddress), memberConfig.rate.signupPerIp));
  if (!withinRate) return back('sent=1'); // same answer, nothing sent

  const origin = isProduction() ? signupConfig.siteUrl : new URL(request.url).origin;
  try {
    const ref = await createSignup(kv, sub);
    const link = `${origin}${signupPath('/confirm')}?s=${encodeURIComponent(ref)}`;
    await sendConfirmation({ email: sub.email, first: sub.first, last: sub.last, lists: sub.lists }, link);
  } catch (err) {
    console.error('[signup] confirmation email failed', err);
    await alertStaff('problem', 'a confirmation email could not be sent', [
      `Someone tried to subscribe as ${sub.first} ${sub.last} <${sub.email}> but the confirmation email failed.`,
      `Error: ${String((err as Error).message ?? err).slice(0, 300)}`,
    ], ['A confirmation email could not be sent, so people cannot finish subscribing. Check Postmark.']);
    return back('error=send');
  }
  return back('sent=1');
};
