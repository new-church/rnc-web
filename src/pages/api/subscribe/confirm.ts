import type { APIRoute } from 'astro';
import { readToken, signupPath, subscribeInPlanningCenter } from '../../../lib/signup';

export const prerender = false;

const go = (suffix: string, query = '') => new Response(null, { status: 303, headers: { Location: `${signupPath(suffix)}${query}` } });

/** Step 2: the person pressed Confirm on the page the email linked to. */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const token = String(form.get('t') ?? '');
  const sub = readToken(token);
  if (!sub) return go('/confirm', '?error=expired');
  try {
    await subscribeInPlanningCenter(sub);
  } catch (err) {
    console.error('[signup] Planning Center write failed', err);
    return go('/confirm', `?error=failed&t=${encodeURIComponent(token)}`);
  }
  return go('/confirmed');
};
