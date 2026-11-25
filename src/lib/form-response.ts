/**
 * Forms work two ways. Without JavaScript the browser posts and follows a redirect (the old way). With JavaScript the
 * page posts in the background (Accept: application/json), and an error is shown in place, so nothing typed is lost.
 * One helper so every public form answers both ways the same.
 */
export const wantsJson = (request: Request) => (request.headers.get('accept') ?? '').includes('application/json');

type Answer = { ok: true; redirect: string } | { ok: false; redirect: string; message: string; status?: number };

export function formAnswer(request: Request, a: Answer): Response {
  if (wantsJson(request)) {
    const body = a.ok ? { ok: true, redirect: a.redirect } : { ok: false, message: a.message };
    return new Response(JSON.stringify(body), {
      status: a.ok ? 200 : (a.status ?? 422),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return new Response(null, { status: 303, headers: { Location: a.redirect } });
}
