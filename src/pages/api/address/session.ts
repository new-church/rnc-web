import type { APIRoute } from 'astro';
import { grantAddressAccess } from '../../../lib/address-access';
import { verifyTurnstile } from '../../../lib/signup';

export const prerender = false;

/** Trades a passed Turnstile token for 30 minutes of address lookups (see lib/address-access.ts). */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  let token = '';
  try {
    token = String(((await request.json()) as { token?: unknown }).token ?? '');
  } catch {
    return new Response(JSON.stringify({ error: 'bad-request' }), { status: 400 });
  }
  if (!(await verifyTurnstile(token, clientAddress))) return new Response(JSON.stringify({ error: 'check' }), { status: 403 });
  grantAddressAccess(cookies);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};
