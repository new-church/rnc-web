/** Minimal published-ICS parser for Outlook / Exchange calendars. */

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

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseProps(block: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith('BEGIN:') || line.startsWith('END:')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const keyPart = line.slice(0, sep);
    const value = line.slice(sep + 1);
    const key = keyPart.split(';')[0]!.toUpperCase();
    props[key] = value;
    props[`${key}_RAW`] = keyPart;
  }
  return props;
}

function parseIcsDate(
  value: string,
  rawKey: string | undefined,
  isEnd = false,
): { iso: string; allDay: boolean } {
  const params = (rawKey ?? '')
    .split(';')
    .slice(1)
    .reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split('=');
      if (k && v) acc[k.toUpperCase()] = v;
      return acc;
    }, {});

  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    // Exclusive end dates in ICS all-day: keep as date string for callers.
    return { iso: `${y}-${m}-${d}`, allDay: true };
  }

  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  if (!match) {
    return { iso: value, allDay: false };
  }

  const [, y, mo, d, h, mi, s, z] = match;
  if (z) {
    return {
      iso: new Date(
        Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s!),
      ).toISOString(),
      allDay: false,
    };
  }

  const iana = toIanaTimeZone(params.TZID);

  // Interpret wall time in the given zone via Intl offset lookup.
  const asUtcGuess = Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s!);
  const offsetMs = tzOffsetMs(iana, asUtcGuess);
  void isEnd;
  return {
    iso: new Date(asUtcGuess - offsetMs).toISOString(),
    allDay: false,
  };
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
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';
  const asLocal = Date.UTC(
    +get('year'),
    +get('month') - 1,
    +get('day'),
    +get('hour'),
    +get('minute'),
    +get('second'),
  );
  return asLocal - utcMs;
}

export function parseIcs(ics: string): CalendarPayload {
  const text = unfold(ics);
  const nameMatch = text.match(/X-WR-CALNAME:(.+)/i);
  const name = nameMatch ? unescapeText(nameMatch[1]!.trim()) : 'Calendar';

  const events: CalendarEvent[] = [];
  const eventBlocks = text.split(/BEGIN:VEVENT/i).slice(1);

  for (const chunk of eventBlocks) {
    const block = chunk.split(/END:VEVENT/i)[0] ?? '';
    const props = parseProps(block);
    if (!props.DTSTART) continue;

    const start = parseIcsDate(props.DTSTART, props.DTSTART_RAW);
    const end = props.DTEND
      ? parseIcsDate(props.DTEND, props.DTEND_RAW, true)
      : start;

    events.push({
      uid: props.UID ?? `${props.SUMMARY}-${props.DTSTART}`,
      title: unescapeText(props.SUMMARY ?? 'Event'),
      description: unescapeText(props.DESCRIPTION ?? '').trim(),
      location: unescapeText(props.LOCATION ?? '').trim(),
      start: start.iso,
      end: end.iso,
      allDay: start.allDay,
    });
  }

  events.sort((a, b) => a.start.localeCompare(b.start));

  return {
    name,
    events,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchCalendar(
  icsUrl: string,
  init?: RequestInit,
): Promise<CalendarPayload> {
  const res = await fetch(icsUrl, {
    ...init,
    headers: {
      Accept: 'text/calendar, text/plain, */*',
      'User-Agent': 'RosevilleNewChurchWeb/1.0',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Calendar fetch failed (${res.status})`);
  }
  const body = await res.text();
  return parseIcs(body);
}
