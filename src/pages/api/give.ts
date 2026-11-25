import type { APIRoute } from 'astro';
import { giveDetails } from '../../lib/give';
import { verifyTurnstile } from '../../lib/signup';
import { memberConfig } from '../../lib/members/config';
import { ipHash } from '../../lib/members/crypto';
import { memberKv } from '../../lib/members/kv';
import { withinLimit } from '../../lib/members/rate';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** Returns the PayID and bank details, but only to a request carrying a passed Turnstile token. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!(await withinLimit(memberKv(), 'give-ip', ipHash(clientAddress), memberConfig.rate.givePerIp))) return json({ error: 'limit' }, 429);
  let token = '';
  try {
    token = String(((await request.json()) as { token?: unknown }).token ?? '');
  } catch {
    return json({ error: 'bad-request' }, 400);
  }

  if (!(await verifyTurnstile(token, clientAddress))) return json({ error: 'check' }, 403);

  const details = giveDetails();
  if (!details) return json({ error: 'unavailable' }, 503);
  return json(details);
};
