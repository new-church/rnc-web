/** Published-ICS reader for Outlook / Exchange calendars, including repeating events. */
import ICAL from 'ical.js';

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  /** ISO start (UTC instant or local date for all-day). */
  start: string;
  /** ISO end. */
  end: string;
  allDay: boolean;
  /**
   * Cancelled on purpose: "Cancelled" (or "Postponed") in the title, a title starting "No ...", or STATUS:CANCELLED.
   * To announce a cancellation, rename the event in Outlook, e.g. "Cancelled: Meditation". A deleted event simply
   * disappears, which is how to tidy the calendar, so deleting is NOT a cancellation.
   */
  cancelled: boolean;
};

export type CalendarPayload = {
  name: string;
  events: CalendarEvent[];
  fetchedAt: string;
};

/** Church calendar is Sydney-local; use this when Outlook omits or uses an unknown TZID. */
const DEFAULT_TZ = 'Australia/Sydney';

/** Windows → IANA timezone IDs that appear in Outlook/Exchange ICS feeds. */
const WINDOWS_TZ: Record<string, string> = {
  'AUS Eastern Standard Time': 'Australia/Sydney',
  // Outlook often labels NSW/Sydney calendars as Tasmania (same AEST/AEDT offsets).
  'Tasmania Standard Time': 'Australia/Hobart',
  'E. Australia Standard Time': 'Australia/Brisbane',
  'AUS Central Standard Time': 'Australia/Darwin',
  'Cen. Australia Standard Time': 'Australia/Adelaide',
  'AUS Western Standard Time': 'Australia/Perth',
  'W. Australia Standard Time': 'Australia/Perth',
  'Greenwich Standard Time': 'UTC',
  UTC: 'UTC',
  'UTC Standard Time': 'UTC',
};

function toIanaTimeZone(tzid: string | undefined): string {
  if (!tzid) return DEFAULT_TZ;
  if (WINDOWS_TZ[tzid]) return WINDOWS_TZ[tzid]!;
  // Already an IANA id (e.g. Australia/Sydney), or unknown — validate via Intl.
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tzid });
    return tzid;
  } catch {
    return DEFAULT_TZ;
  }
}

function tzOffsetMs(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '0';
  const asLocal = Date.UTC(+get('year'), +get('month') - 1, +get('day'), +get('hour'), +get('minute'), +get('second'));
  return asLocal - utcMs;
}

/** A wall-clock time in an IANA zone, as a true instant. */
function wallToInstant(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  // Two passes so times either side of a daylight-saving change land correctly.
  const first = guess - tzOffsetMs(zone, guess);
  return new Date(guess - tzOffsetMs(zone, first));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** All-day events give "YYYY-MM-DD"; timed events give an ISO instant. */
function toIso(t: ICAL.Time, tzid: string | undefined): string {
  if (t.isDate) return `${t.year}-${pad(t.month)}-${pad(t.day)}`;
  if (t.zone && t.zone.tzid === 'UTC') {
    return new Date(Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second)).toISOString();
  }
  return wallToInstant(t.year, t.month, t.day, t.hour, t.minute, t.second, toIanaTimeZone(tzid)).toISOString();
}

export const isCancelledTitle = (t: string) =>
  /\b(cancell?ed|postponed)\b/i.test(t) || /^\s*NO\s+[A-Za-z]/.test(t);

const tzidOf = (e: ICAL.Event): string | undefined => {
  const v = e.component.getFirstProperty('dtstart')?.getParameter('tzid');
  return typeof v === 'string' ? v : undefined;
};

const PAST_DAYS = 60;
const HORIZON_DAYS = 540;
const MAX_OCCURRENCES_PER_SERIES = 400;

export function parseIcs(ics: string, now = new Date()): CalendarPayload {
  const comp = new ICAL.Component(ICAL.parse(ics));
  const name = String(comp.getFirstPropertyValue('x-wr-calname') ?? 'Calendar');

  const events = comp.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v));
  const masters = events.filter((e) => !e.isRecurrenceException());
  // A single changed occurrence of a repeating event (for example one renamed "Cancelled: ...").
  for (const ex of events.filter((e) => e.isRecurrenceException())) {
    masters.find((m) => m.uid === ex.uid)?.relateException(ex);
  }

  const from = now.getTime() - PAST_DAYS * 86400_000;
  const horizon = now.getTime() + HORIZON_DAYS * 86400_000;
  const status = (e: ICAL.Event) => String(e.component.getFirstPropertyValue('status') ?? '').toUpperCase();
  const out: CalendarEvent[] = [];

  for (const ev of masters) {
    const push = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
      const title = item.summary || ev.summary || 'Event';
      const tzid = tzidOf(item) ?? tzidOf(ev);
      const startIso = toIso(start, tzid);
      const endIso = toIso(end, tzid);
      const t0 = new Date(start.isDate ? `${startIso}T00:00:00Z` : startIso).getTime();
      const t1 = new Date(end.isDate ? `${endIso}T00:00:00Z` : endIso).getTime();
      if (t1 < from || t0 > horizon) return;
      out.push({
        uid: `${ev.uid}#${startIso}`,
        title,
        cancelled: status(item) === 'CANCELLED' || isCancelledTitle(title),
        description: (item.description ?? '').trim(),
        location: (item.location ?? '').trim(),
        start: startIso,
        end: endIso,
        allDay: start.isDate,
      });
    };

    if (!ev.isRecurring()) {
      push(ev, ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, next = it.next(); next && n < MAX_OCCURRENCES_PER_SERIES; n++, next = it.next()) {
      const d = ev.getOccurrenceDetails(next);
      const tz = tzidOf(d.item) ?? tzidOf(ev);
      const startMs = d.startDate.isDate
        ? Date.UTC(d.startDate.year, d.startDate.month - 1, d.startDate.day)
        : new Date(toIso(d.startDate, tz)).getTime();
      if (startMs > horizon) break;
      push(d.item, d.startDate, d.endDate);
    }
  }

  out.sort((a, b) => a.start.localeCompare(b.start));
  return { name, events: out, fetchedAt: new Date().toISOString() };
}

async function fetchCalendar(icsUrl: string): Promise<CalendarPayload> {
  const res = await fetch(icsUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: 'text/calendar, text/plain, */*',
      'User-Agent': 'RosevilleNewChurchWeb/1.0',
    },
  });
  if (!res.ok) {
    throw new Error(`Calendar fetch failed (${res.status})`);
  }
  const body = await res.text();
  if (!body.includes('BEGIN:VCALENDAR')) throw new Error('Not a calendar');
  return parseIcs(body);
}

// The calendar is fetched on the server and kept for five minutes per server instance, and the page is also cached
// at the edge (see events/index.astro), so visitors never hit Outlook directly. If Outlook is briefly unavailable,
// the last good copy keeps being served.
const TTL_MS = 5 * 60_000;
let cache: { url: string; at: number; payload: CalendarPayload } | undefined;

export async function getCalendar(icsUrl: string): Promise<CalendarPayload | undefined> {
  if (cache && cache.url === icsUrl && Date.now() - cache.at < TTL_MS) return cache.payload;
  try {
    const payload = await fetchCalendar(icsUrl);
    cache = { url: icsUrl, at: Date.now(), payload };
    return payload;
  } catch (err) {
    console.error('[calendar] fetch failed, using last good copy:', err);
    return cache?.url === icsUrl ? cache.payload : undefined;
  }
}
