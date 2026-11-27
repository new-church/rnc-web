import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { trackServerEvent } from '../../lib/notify';

export const prerender = false;

/**
 * Church-domain link to a newsletter PDF: /newsletters/<entry id>.pdf (e.g. /newsletters/december-2026.pdf).
 * The PDF stays in Vercel Blob; this sends the reader on to the entry's pdfUrl and records a
 * `newsletter_open` event in GA4, so opens from emails, printed links and shares are counted too.
 * Add `?src=email` (or similar) to a link to say where it came from.
 */
export const GET: APIRoute = async ({ params, url, cookies }) => {
  const slug = params.slug ?? '';
  const issue = (await getCollection('newsletters')).find((i) => i.id === slug);
  if (!issue) return new Response('Not found', { status: 404 });

  const source = (url.searchParams.get('src') ?? 'direct').slice(0, 40);
  await trackServerEvent('newsletter_open', { newsletter: slug, source }, cookies.get('_ga')?.value);

  return new Response(null, {
    status: 302,
    headers: { Location: issue.data.pdfUrl, 'Cache-Control': 'no-store' },
  });
};
