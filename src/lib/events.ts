import { getCollection, type CollectionEntry } from 'astro:content';
import { getCalendar, type CalendarEvent as RawEvent } from './ics';

export type Info = CollectionEntry<'event-info'>;

export type SiteEvent = RawEvent & {
  /** Unique per occurrence, used for the page address. */
  slug: string;
  info?: Info;
  /** Page to open for this event: the series page, a hand-built page, or the single-occurrence page. */
  href: string;
  /** Title as shown (the calendar title, minus a trailing clock time in brackets). */
  displayTitle: string;
  where: 'In person' | 'On Zoom' | 'Online';
  image?: string;
  imageAlt?: string;
  category: 'Worship' | 'Study' | 'Community';
  /** Promoted on the home page: the calendar entry has a line "Pin to home page". */
  pinned: boolean;
  /** Anything specific to this date that was typed into the calendar entry (the standard text and link are removed). */
  note: string;
  /** Card text: this date's note if there is one, otherwise the info summary. */
  summary: string;
};

const TZ = 'Australia/Sydney';

export const slugify = (s: string, max = 60) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);

/** "Sun 6 Dec, 10am" or "Fri 22 Jan" (all-day), in Sydney time. */
export function whenLabel(e: Pick<SiteEvent, 'start' | 'allDay'>): string {
  const d = parseStart(e);
  const day = new Intl.DateTimeFormat('en-AU', { timeZone: e.allDay ? 'UTC' : TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  if (e.allDay) return day;
  const time = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
    .format(d)
    .replace(':00', '')
    .replace(/\s/g, '')
    .toLowerCase();
  return `${day}, ${time}`;
}

/** ics.ts gives an ISO instant for timed events and a YYYY-MM-DD date for all-day ones. */
const parseStart = (e: Pick<SiteEvent, 'start' | 'allDay'>) => new Date(e.allDay ? `${e.start}T00:00:00Z` : e.start);
const endMs = (e: RawEvent) => (e.allDay ? new Date(`${e.end}T00:00:00Z`).getTime() : new Date(e.end).getTime());

const stripTime = (t: string) => t.replace(/^\s*(?:cancell?ed|postponed)\s*[:\-–]\s*/i, '').replace(/\s*\([^)]*\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b[^)]*\)\s*$/i, '').trim() || t;

/**
 * The info entry for a calendar title. An entry matches when its file name (e.g. "meditation") or one of its `match`
 * phrases appears in the title; the longest match wins, so a specific entry beats a general one. An entry never
 * matches a title containing one of its `exclude` phrases.
 */
export function findInfo(infos: Info[], title: string): Info | undefined {
  const lower = title.toLowerCase();
  let best: Info | undefined;
  let bestLen = 0;
  for (const i of infos) {
    if (i.data.exclude.some((x) => lower.includes(x.toLowerCase()))) continue;
    const keys = [i.id.replace(/-/g, ' '), ...i.data.match].map((k) => k.toLowerCase());
    for (const k of keys) {
      if (k && lower.includes(k) && k.length > bestLen) {
        best = i;
        bestLen = k.length;
      }
    }
  }
  return best;
}

/** The calendar description without the standard summary and "More information" link added by `npm run calendar -- details`. */
const PIN_LINE = /^\s*(\[?pin(ned)?\]?|pin to (the )?home ?page)\s*$/i;

function noteOf(description: string, info?: Info): string {
  return description
    .split('\n')
    .filter((l) => !PIN_LINE.test(l))
    .join('\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^More information:/i.test(p) && p !== info?.data.summary)
    .join('\n\n');
}

const isZoom = (e: RawEvent) => /zoom|online/i.test(e.location);

export async function getInfos(): Promise<Info[]> {
  return getCollection('event-info');
}

/** Calendar events from `since` (default: start of today, Sydney) onward, enriched with their info entry. */
export async function getEvents(opts: { since?: Date } = {}): Promise<SiteEvent[]> {
  const icsUrl =
    import.meta.env.CALENDAR_ICS_URL ||
    import.meta.env.PUBLIC_CALENDAR_ICS_URL ||
    DEFAULT_ICS;
  const [cal, infos] = await Promise.all([getCalendar(icsUrl), getInfos()]);
  if (!cal) return [];
  const since = (opts.since ?? new Date(Date.now() - 36 * 3600_000)).getTime();
  return cal.events
    .filter((e) => endMs(e) >= since)
    .map((e) => {
      const info = findInfo(infos, e.title);
      const date = parseStart(e).toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const slug = `${date}-${slugify(e.title)}`;
      const note = noteOf(e.description, info);
      const pinned = e.description.split('\n').some((l) => PIN_LINE.test(l));
      return {
        ...e,
        description: note,
        note,
        pinned,
        slug,
        info,
        displayTitle: stripTime(e.title),
        href: info ? (info.data.page ?? `/events/${info.id}`) : `/events/${slug}`,
        where: info?.data.where ?? (isZoom(e) ? 'On Zoom' : 'In person'),
        image: info?.data.image,
        imageAlt: info?.data.imageAlt,
        category: info?.data.category ?? 'Community',
        summary: note || info?.data.summary || '',
      } satisfies SiteEvent;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export const DEFAULT_ICS =
  'https://outlook.office365.com/owa/calendar/d3aab09d67bf4025ae539869196ad552@rosevillenewchurch.com.au/e57651adf65b458bb5d1e3154770ba4517495040307124971130/calendar.ics';

export const icsUrl = import.meta.env.PUBLIC_CALENDAR_ICS_URL || DEFAULT_ICS;
