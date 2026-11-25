import type { APIRoute } from 'astro';
import { memberConfig } from '../../../lib/members/config';
import { ipHash } from '../../../lib/members/crypto';
import { memberKv } from '../../../lib/members/kv';
import { withinLimit } from '../../../lib/members/rate';
import { addressLookupAvailable, resolve, suggest } from '../../../lib/address';
import { hasAddressAccess } from '../../../lib/address-access';

export const prerender = false;

/** The browser's search-session id: a random UUID, or nothing. */
const sessionOf = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{20,40}$/i.test(v) ? v : undefined);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/**
 * Address suggestions for the signup and details forms (Google Places, see lib/address.ts). Public (the signup form
 * is), so it needs the signed cookie earned with a Turnstile check (/api/address/session), is rate limited per IP, and
 * has a daily cap across everyone; picking a suggestion (POST) has the tighter limits.
 */
export const GET: APIRoute = async ({ url, clientAddress, cookies }) => {
  if (!addressLookupAvailable()) return json({ previews: [] }, 503);
  if (!hasAddressAccess(cookies)) return json({ error: 'check' }, 403);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const session = sessionOf(url.searchParams.get('session'));
  if (q.length < 3) return json({ previews: [] });
  if (!(await withinLimit(memberKv(), 'addr-suggest', ipHash(clientAddress), memberConfig.rate.addressSuggestPerIp))) return json({ error: 'Too many searches. Please type the address in.' }, 429);
  if (!(await withinLimit(memberKv(), 'addr-suggest-all', 'day', memberConfig.rate.addressSuggestAllPerDay))) return json({ error: 'Address search is busy. Please type the address in.' }, 429);
  try {
    return json({ previews: await suggest({ q, session }) });
  } catch (err) {
    console.error('[address] suggest failed', err instanceof Error ? err.message : err);
    return json({ error: 'Address search isn’t working just now. Please type the address in.' }, 502);
  }
};

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  if (!addressLookupAvailable()) return json({ error: 'Not available' }, 503);
  if (!hasAddressAccess(cookies)) return json({ error: 'check' }, 403);
  let id = '';
  let session: string | undefined;
  try {
    const body = (await request.json()) as { id?: string; session?: string };
    id = String(body.id ?? '').trim().slice(0, 300);
    session = sessionOf(body.session);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!id) return json({ error: 'Missing id' }, 400);
  if (!(await withinLimit(memberKv(), 'addr-resolve', ipHash(clientAddress), memberConfig.rate.addressResolvePerIp))) return json({ error: 'Too many lookups. Please type the address in.' }, 429);
  if (!(await withinLimit(memberKv(), 'addr-resolve-all', 'day', memberConfig.rate.addressResolveAllPerDay))) return json({ error: 'Address search is busy. Please type the address in.' }, 429);
  try {
    return json({ address: await resolve(id, session) });
  } catch (err) {
    console.error('[address] resolve failed', err instanceof Error ? err.message : err);
    return json({ error: 'Couldn’t get that address. Please type it in.' }, 502);
  }
};
