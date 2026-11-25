import type { APIRoute } from 'astro';
import { signupConfig } from '../../../lib/signup/config';
import { alertStaff } from '../../../lib/signup/alert';
import { isProduction, signupPath, sendConfirmation, verifyTurnstile } from '../../../lib/signup';
import { formAnswer } from '../../../lib/form-response';
import { memberKv } from '../../../lib/members/kv';
import { memberConfig } from '../../../lib/members/config';
import { ipHash, sha256 } from '../../../lib/members/crypto';
import { withinLimit } from '../../../lib/members/rate';
import { createSignup, parseSignupForm, signupErrors } from '../../../lib/members/signup';

export const prerender = false;

/**
 * Step 1: check Turnstile, then email a confirmation link. The link holds only a random reference; the details wait
 * in the items table (7 days) until the person confirms. Always answers the same way for any valid address.
 * Answers a background post with JSON (so the form keeps what was typed) and a normal post with a redirect.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const back = (q: string) => `${signupPath()}?${q}`;
  const form = await request.formData();

  const parsed = parseSignupForm(form);
  if (!parsed.ok) {
    return formAnswer(request, { ok: false, redirect: back(`error=invalid&detail=${encodeURIComponent(parsed.error)}`), message: parsed.error });
  }
  const sub = parsed.value;

  const passed = await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), clientAddress);
  if (!passed) return formAnswer(request, { ok: false, redirect: back('error=check'), message: signupErrors.check, status: 403 });

  const kv = memberKv();
  const withinRate =
    (await withinLimit(kv, 'signup-email', sha256(sub.email).slice(0, 24), memberConfig.rate.signupPerEmail)) &&
    (await withinLimit(kv, 'signup-ip', ipHash(clientAddress), memberConfig.rate.signupPerIp));
  // Same answer, nothing sent.
  if (!withinRate) return formAnswer(request, { ok: true, redirect: back('sent=1') });

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
    return formAnswer(request, { ok: false, redirect: back('error=send'), message: signupErrors.send, status: 502 });
  }
  return formAnswer(request, { ok: true, redirect: back('sent=1') });
};
