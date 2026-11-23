import type { SiteEvent } from './events';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

/** Fold long lines to 75 characters, as the format requires. */
const fold = (line: string) => (line.match(/.{1,73}/g) ?? ['']).join('\r\n ');

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const day = (ymd: string) => ymd.replace(/-/g, '');

/** A calendar file for a few events, so someone can add just those to their own calendar (not the whole feed). */
export function buildIcs(events: SiteEvent[], origin: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Roseville New Church//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    const url = new URL(e.href, origin).href;
    const text = [e.summary, `More information: ${url}`].filter(Boolean).join('\n\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${utc(new Date().toISOString())}`,
      e.allDay ? `DTSTART;VALUE=DATE:${day(e.start)}` : `DTSTART:${utc(e.start)}`,
      e.allDay ? `DTEND;VALUE=DATE:${day(e.end)}` : `DTEND:${utc(e.end)}`,
      `SUMMARY:${esc(e.displayTitle)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      `DESCRIPTION:${esc(text)}`,
      `URL:${url}`,
      ...(e.cancelled ? ['STATUS:CANCELLED'] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
