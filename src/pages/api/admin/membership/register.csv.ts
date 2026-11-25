import type { APIRoute } from 'astro';
import { Pco, loadSnapshot, fieldValues } from '../../../../lib/sync/pco';
import { isLive } from '../../../../lib/signup';
import { memberConfig } from '../../../../lib/members/config';

export const prerender = false;

/** Spreadsheet programs run text that starts with = + - @ as a formula, so those cells get a leading apostrophe. */
const cell = (v: string) => {
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/**
 * Current members from Planning Center (the Roll Book), as a dated CSV for the Committee, the auditor or the register.
 * Needs a live environment: it reads every person.
 */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.adminSession) return new Response('Unauthorized', { status: 401 });
  if (!isLive()) return new Response('The register export reads Planning Center, so it only works in production (or with SIGNUP_LIVE=1).', { status: 503 });

  const snap = await loadSnapshot(Pco.fromEnv());
  const rollNames = Object.values(memberConfig.rollBookFields);
  const header = ['Planning Center ID', 'First name', 'Last name', 'Status', 'Membership', 'Email', 'Street', 'Street 2', 'Suburb', 'State', 'Postcode', 'Country', ...rollNames];
  const rows = [...snap.people.values()]
    .filter((p) => p.membership === memberConfig.membership.member)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .map((p) => {
      const email = (p.emails.find((e) => e.primary) ?? p.emails[0])?.address ?? '';
      const a = p.addresses.find((x) => x.primary) ?? p.addresses[0];
      const roll = rollNames.map((n) => (snap.fields[n] ? fieldValues(p, snap.fields[n]).join('; ') : ''));
      return [p.id, p.firstName, p.lastName, p.status, p.membership ?? '', email, a?.street1 ?? '', a?.street2 ?? '', a?.city ?? '', a?.state ?? '', a?.zip ?? '', a?.country ?? '', ...roll];
    });
  const today = new Date().toISOString().slice(0, 10);
  const body = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="register-of-members-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
