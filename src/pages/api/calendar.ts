import type { APIRoute } from 'astro';
import { fetchCalendar } from '../../lib/ics';

export const prerender = false;

const DEFAULT_ICS =
  'https://outlook.office365.com/owa/calendar/d3aab09d67bf4025ae539869196ad552@rosevillenewchurch.com.au/9a35e72b134e4c91bbb5b6956e035fa42959863401420048630/calendar.ics';

export const GET: APIRoute = async () => {
  const icsUrl =
    import.meta.env.CALENDAR_ICS_URL ||
    import.meta.env.PUBLIC_CALENDAR_ICS_URL ||
    DEFAULT_ICS;

  try {
    const payload = await fetchCalendar(icsUrl, {
      // Avoid stale CDN copies while editors update Outlook.
      cache: 'no-store',
    });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Short browser cache; always revalidate on the edge when possible.
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message, events: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
