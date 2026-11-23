import type { APIRoute } from 'astro';
import { getEvents } from '../../../lib/events';
import { buildIcs } from '../../../lib/eventIcs';

export const prerender = false;

/**
 * "Add to my calendar" for one event. The slug is either an event write-up (/events/christmas-service: its upcoming
 * dates) or a single calendar entry (/events/202612061000-advent-service). A trailing ".ics" is ignored.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const slug = (params.slug ?? '').replace(/\.ics$/i, '');
  const all = await getEvents();
  const mine = all.filter((e) => (e.info?.id === slug || e.slug === slug) && !e.cancelled);
  if (mine.length === 0) return new Response('Event not found', { status: 404 });
  return new Response(buildIcs(mine, url.origin), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
};
