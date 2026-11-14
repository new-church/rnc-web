#!/usr/bin/env node
// Manage the public church calendar ("Roseville New Church Events" in the admin@ mailbox),
// which feeds the published .ics used by /events. Runs locally; never deploy these credentials.
//
//   npm run calendar -- list [--from 2026-11-01] [--days 60]
//   npm run calendar -- add "Service" 2026-11-15 10:00 11:00 [--body "..."] [--location "..."] [--apply]
//   npm run calendar -- add "Annual camp" 2027-01-22 2027-01-26 --all-day [--body "..."] [--location "..."] [--apply]   (last day inclusive)
//   npm run calendar -- update <eventId> [--title ".."] [--date YYYY-MM-DD --start HH:MM --end HH:MM] [--body ".."] [--location ".."] [--apply]
//   npm run calendar -- delete <eventId> [--apply]
//
// Writes are a dry run unless --apply is given. Needs M365_TENANT_ID, M365_CLIENT_ID and
// M365_CLIENT_SECRET in .env (see .env.example).

import { parseArgs } from 'node:util';

const MAILBOX = process.env.M365_CALENDAR_MAILBOX || 'admin@rosevillenewchurch.com.au';
const CALENDAR_NAME = process.env.M365_CALENDAR_NAME || 'Roseville New Church Events';
const TZ = 'AUS Eastern Standard Time'; // Outlook's name for Sydney; matches the published feed
const DEFAULT_LOCATION = '2b Shirley Rd';
const GRAPH = 'https://graph.microsoft.com/v1.0';

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function getToken() {
  const { M365_TENANT_ID: tenant, M365_CLIENT_ID: id, M365_CLIENT_SECRET: secret } = process.env;
  if (!tenant || !id || !secret) fail('Set M365_TENANT_ID, M365_CLIENT_ID and M365_CLIENT_SECRET in .env');
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const hint = String(json.error_description || '').includes('AADSTS7000215')
      ? ' (wrong secret: use the secret Value, not the Secret ID)'
      : '';
    fail(`Sign-in failed: ${json.error_description?.split('\r\n')[0] || json.error}${hint}`);
  }
  return json.access_token;
}

let token;
async function graph(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: `outlook.timezone="${TZ}"`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    fail(`Graph ${method} ${path.split('?')[0]} -> ${res.status} ${e.code || ''}: ${e.message || ''}`);
  }
  return json;
}

async function calendarBase() {
  const user = encodeURIComponent(MAILBOX);
  const { value } = await graph(`/users/${user}/calendars?$top=50`);
  const cal = value.find((c) => c.name === CALENDAR_NAME);
  if (!cal) fail(`No calendar named "${CALENDAR_NAME}" in ${MAILBOX}. Found: ${value.map((c) => c.name).join(', ')}`);
  return `/users/${user}/calendars/${encodeURIComponent(cal.id)}`;
}

const timeOk = (t) => /^\d{2}:\d{2}$/.test(t);
const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const fmt = (e) =>
  `${e.start.dateTime.slice(0, 16).replace('T', ' ')} -> ${e.end.dateTime.slice(11, 16)}${e.isAllDay ? ' (all day)' : ''}  ${e.subject}${
    e.location?.displayName ? `  @ ${e.location.displayName}` : ''
  }\n    id: ${e.id}`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: 'string' },
    days: { type: 'string' },
    title: { type: 'string' },
    date: { type: 'string' },
    start: { type: 'string' },
    end: { type: 'string' },
    body: { type: 'string' },
    location: { type: 'string' },
    'all-day': { type: 'boolean', default: false },
    apply: { type: 'boolean', default: false },
  },
});
const [command, ...args] = positionals;

token = await getToken();
const base = await calendarBase();

if (command === 'list') {
  const from = opts.from ? new Date(`${opts.from}T00:00:00`) : new Date();
  const to = new Date(from.getTime() + Number(opts.days || 60) * 86400000);
  const q = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $orderby: 'start/dateTime',
    $top: '100',
  });
  const { value } = await graph(`${base}/calendarView?${q}`);
  console.log(value.length ? value.map(fmt).join('\n') : 'No events in that range.');
} else if (command === 'add') {
  const allDay = opts['all-day'];
  const [title, date, a3, a4] = args;
  let startDt, endDt;
  if (allDay) {
    // add "Title" firstDay lastDay --all-day: the last day is inclusive; Outlook wants the day after.
    if (!title || !dateOk(date) || !dateOk(a3)) fail('Usage: add "Title" YYYY-MM-DD YYYY-MM-DD --all-day [--body ..] [--location ..] [--apply]');
    const next = new Date(`${a3}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    startDt = `${date}T00:00:00`;
    endDt = `${next.toISOString().slice(0, 10)}T00:00:00`;
  } else {
    if (!title || !dateOk(date) || !timeOk(a3) || !timeOk(a4)) {
      fail('Usage: add "Title" YYYY-MM-DD HH:MM HH:MM [--body ..] [--location ..] [--apply]');
    }
    startDt = `${date}T${a3}:00`;
    endDt = `${date}T${a4}:00`;
  }
  const event = {
    subject: title,
    isAllDay: allDay,
    start: { dateTime: startDt, timeZone: TZ },
    end: { dateTime: endDt, timeZone: TZ },
    location: { displayName: opts.location ?? DEFAULT_LOCATION },
    showAs: allDay ? 'free' : 'busy',
    ...(opts.body ? { body: { contentType: 'text', content: opts.body } } : {}),
  };
  console.log(`${opts.apply ? 'Adding' : 'Dry run, would add'} to "${CALENDAR_NAME}":\n${JSON.stringify(event, null, 2)}`);
  if (opts.apply) {
    const created = await graph(`${base}/events`, { method: 'POST', body: event });
    console.log(`Created.\n${fmt(created)}`);
  } else {
    console.log('Add --apply to create it.');
  }
} else if (command === 'update') {
  const [id] = args;
  if (!id) fail('Usage: update <eventId> [--title ..] [--date .. --start .. --end ..] [--body ..] [--location ..] [--apply]');
  const patch = {};
  if (opts.title) patch.subject = opts.title;
  if (opts.location) patch.location = { displayName: opts.location };
  if (opts.body) patch.body = { contentType: 'text', content: opts.body };
  if (opts.date || opts.start || opts.end) {
    if (!dateOk(opts.date) || !timeOk(opts.start) || !timeOk(opts.end)) fail('Changing time needs --date, --start and --end together');
    patch.start = { dateTime: `${opts.date}T${opts.start}:00`, timeZone: TZ };
    patch.end = { dateTime: `${opts.date}T${opts.end}:00`, timeZone: TZ };
  }
  if (!Object.keys(patch).length) fail('Nothing to change.');
  console.log(`${opts.apply ? 'Updating' : 'Dry run, would update'} ${id}:\n${JSON.stringify(patch, null, 2)}`);
  if (opts.apply) {
    const updated = await graph(`${base}/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
    console.log(`Updated.\n${fmt(updated)}`);
  } else {
    console.log('Add --apply to save it.');
  }
} else if (command === 'delete') {
  const [id] = args;
  if (!id) fail('Usage: delete <eventId> [--apply]');
  const ev = await graph(`${base}/events/${encodeURIComponent(id)}`);
  console.log(`${opts.apply ? 'Deleting' : 'Dry run, would delete'}:\n${fmt(ev)}`);
  if (opts.apply) {
    await graph(`${base}/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
    console.log('Deleted (moved to Deleted Items in admin@).');
  } else {
    console.log('Add --apply to delete it.');
  }
} else {
  fail('Commands: list | add | update | delete (see the header of scripts/calendar.mjs)');
}
