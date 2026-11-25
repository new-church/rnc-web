import type { APIRoute } from 'astro';
import { memberConfig } from '../../../lib/members/config';
import { ipHash } from '../../../lib/members/crypto';
import { memberKv } from '../../../lib/members/kv';
import { withinLimit } from '../../../lib/members/rate';
import { addressLookupAvailable, resolve, suggest } from '../../../lib/postgrid/addresses';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/**
 * Address suggestions for the signup and details forms. Public (the signup form is), so it is rate limited per IP;
 * picking a suggestion (POST) is the call that counts against PostGrid, so it has the tighter limit.
 */
export const GET: APIRoute = async ({ url, clientAddress }) => {
  if (!addressLookupAvailable()) return json({ previews: [] }, 503);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const container = (url.searchParams.get('container') ?? '').trim().slice(0, 200);
  if (!q && !container) return json({ previews: [] });
  if (!(await withinLimit(memberKv(), 'addr-suggest', ipHash(clientAddress), memberConfig.rate.addressSuggestPerIp))) return json({ error: 'Too many searches. Please type the address in.' }, 429);
  try {
    return json({ previews: await suggest({ q: q || undefined, container: container || undefined, countries: (url.searchParams.get('countries') ?? '').slice(0, 40) || undefined }) });
  } catch (err) {
    console.error('[address] suggest failed', err instanceof Error ? err.message : err);
    return json({ error: 'Address search isn’t working just now. Please type the address in.' }, 502);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!addressLookupAvailable()) return json({ error: 'Not available' }, 503);
  let id = '';
  try {
    id = String(((await request.json()) as { id?: string }).id ?? '').trim().slice(0, 300);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!id) return json({ error: 'Missing id' }, 400);
  if (!(await withinLimit(memberKv(), 'addr-resolve', ipHash(clientAddress), memberConfig.rate.addressResolvePerIp))) return json({ error: 'Too many lookups. Please type the address in.' }, 429);
  try {
    return json({ address: await resolve(id) });
  } catch (err) {
    console.error('[address] resolve failed', err instanceof Error ? err.message : err);
    return json({ error: 'Couldn’t get that address. Please type it in.' }, 502);
  }
};
