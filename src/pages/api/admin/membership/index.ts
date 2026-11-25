import type { APIRoute } from 'astro';
import { memberKv } from '../../../../lib/members/kv';
import { decideRequest } from '../../../../lib/members/membership';
import { peopleApi } from '../../../../lib/members/people';

export const prerender = false;

const back = (q: string) => new Response(null, { status: 303, headers: { Location: `/admin/membership?${q}` } });

/** The Secretary records what the Committee decided. The admin gate (middleware) has already run. */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.adminSession;
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const form = await request.formData();
  const text = (k: string) => String(form.get(k) ?? '');
  const choice = text('decision');
  if (choice !== 'approve' && choice !== 'decline') return back('error=' + encodeURIComponent('Please choose a decision.'));

  try {
    const r = await decideRequest(
      { kv: memberKv(), people: peopleApi() },
      {
        personId: text('personId'),
        sk: text('sk'),
        decision: choice,
        decidedBy: session.email,
        resolutionDate: text('resolutionDate'),
        minuteRef: text('minuteRef'),
        proposedBy: text('proposedBy'),
        secondedBy: text('secondedBy'),
        reason: text('reason'),
      },
    );
    return r.ok ? back('ok=1') : back('error=' + encodeURIComponent(r.error));
  } catch (err) {
    console.error('[members] decision failed', err instanceof Error ? err.message : err);
    return back('error=' + encodeURIComponent('Planning Center could not be updated, so nothing was recorded. Please try again.'));
  }
};
