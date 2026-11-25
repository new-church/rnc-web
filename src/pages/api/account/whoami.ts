import type { APIRoute } from 'astro';
import { getSessionContext } from '../../../lib/auth/session';
import { memberContext } from '../../../lib/members/guard';

export const prerender = false;

/**
 * Who this browser is signed in as, for the header's account menu: member, admin, or both. No Planning Center call and
 * no personal details beyond the email the person signed in with.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const m = await memberContext(cookies);
  const a = await getSessionContext({ cookies });
  const member = Boolean(m && (m.session.personId || m.session.candidates.length));
  return new Response(JSON.stringify({ member, admin: Boolean(a), email: m?.session.email ?? a?.email ?? '' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
