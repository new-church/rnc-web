/**
 * Monthly backup of the Planning Center People data, zipped and emailed (Postmark) to BACKUP_EMAIL_TO.
 *
 * The zip holds one JSON file per kind of record (exactly as Planning Center returns it, so it can be re-imported or
 * inspected later) plus people.csv for reading in a spreadsheet. Person "medical_notes" are left out on purpose:
 * this goes by email, and health details don't belong in an inbox.
 *
 * Email is not a secure store. The message contains the church's whole contact list, so the receiving mailbox should be
 * protected, and the attachment saved somewhere appropriate and then deleted from the inbox.
 */
import { env } from "../env";
import { zip } from "../zip";
import { sendMail, type Mail } from "../members/mail";
import type { J, Pco } from "./pco";
import { newResult, sydneyDate, type JobResult } from "./util";

/** Postmark allows 10 MB per message including the base64 growth of attachments. */
const MAX_ZIP_BYTES = 7 * 1024 * 1024;

const FILES: [string, string][] = [
  ["people", "/people"],
  ["emails", "/emails"],
  ["phone_numbers", "/phone_numbers"],
  ["addresses", "/addresses"],
  ["field_data", "/field_data"],
  ["households", "/households"],
  ["notes", "/notes"],
  ["lists", "/lists"],
  ["field_definitions", "/field_definitions"],
  ["tabs", "/tabs"],
  ["note_categories", "/note_categories"],
  ["membership_types", "/membership_types"],
];

const cell = (v: unknown) => {
  const s = String(v ?? "");
  const t = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // keep spreadsheets from running text as a formula
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const personOf = (r: J): string | undefined => r.relationships?.person?.data?.id;
const group = (rows: J[]) => {
  const m = new Map<string, J[]>();
  for (const r of rows) {
    const id = personOf(r);
    if (id) m.set(id, [...(m.get(id) ?? []), r]);
  }
  return m;
};

export function peopleCsv(people: J[], emails: J[], phones: J[], addresses: J[]): string {
  const em = group(emails);
  const ph = group(phones);
  const ad = group(addresses);
  const primary = (rows: J[] | undefined) => rows?.find((r) => r.attributes.primary) ?? rows?.[0];
  const header = ["Planning Center ID", "First name", "Last name", "Status", "Membership", "Birthdate", "Email", "Phone", "Street", "Street 2", "Suburb", "State", "Postcode", "Country", "Created", "Updated"];
  const lines = people.map((p) => {
    const a = p.attributes;
    const e = primary(em.get(String(p.id)))?.attributes;
    const t = primary(ph.get(String(p.id)))?.attributes;
    const d = primary(ad.get(String(p.id)))?.attributes;
    return [p.id, a.first_name, a.last_name, a.status, a.membership, a.birthdate, e?.address, t?.number, d?.street_line_1, d?.street_line_2, d?.city, d?.state, d?.zip, d?.country_code, a.created_at, a.updated_at].map(cell).join(",");
  });
  return [header.map(cell).join(","), ...lines].join("\r\n") + "\r\n";
}

export type BackupDeps = {
  apply: boolean;
  pco: Pco;
  to?: string;
  send?: (m: Mail) => Promise<void>;
  now?: Date;
};

const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

export async function runBackup(deps: BackupDeps): Promise<JobResult> {
  const { apply, pco } = deps;
  const to = deps.to ?? env("BACKUP_EMAIL_TO");
  const send = deps.send ?? sendMail;
  const now = deps.now ?? new Date();
  const result = newResult(apply);
  const day = sydneyDate(now);

  if (apply && !to) {
    result.status = "error";
    result.errors.push("BACKUP_EMAIL_TO is not set");
    result.summary = "Backup failed: BACKUP_EMAIL_TO is not set (add it in Vercel).";
    return result;
  }

  const data: Record<string, J[]> = {};
  for (const [file, path] of FILES) data[file] = await pco.all(path);
  for (const p of data.people) delete p.attributes.medical_notes; // health details stay out of email

  const counts: Record<string, number> = {};
  for (const [file] of FILES) counts[file] = data[file].length;
  result.counts = counts;

  const readme = [
    `Planning Center People backup, ${day} (Sydney time).`,
    "",
    "One JSON file per kind of record, as Planning Center returned it, plus people.csv for a spreadsheet.",
    "People's medical notes are not included.",
    "",
    ...FILES.map(([file]) => `${file}.json: ${counts[file]} records`),
    "",
    "This file contains personal details. Keep it somewhere private, and delete it from your inbox once it is saved.",
  ].join("\n");

  const archive = zip([
    { name: "README.txt", data: readme, date: now },
    { name: "people.csv", data: peopleCsv(data.people, data.emails, data.phone_numbers, data.addresses), date: now },
    ...FILES.map(([file]) => ({ name: `${file}.json`, data: JSON.stringify(data[file], null, 1), date: now })),
  ]);
  const kb = Math.round(archive.length / 1024);
  result.counts.zipBytes = archive.length;
  result.lines.push(...FILES.map(([file]) => `${file}: ${counts[file]}`), `zip: ${kb} KB`);

  if (archive.length > MAX_ZIP_BYTES) {
    result.status = "error";
    result.errors.push(`The backup is ${kb} KB, over the ${MAX_ZIP_BYTES / 1024} KB email limit`);
    result.summary = `Backup too large to email (${kb} KB). It needs another way to be stored.`;
    return result;
  }

  if (!apply) {
    result.summary = `Dry run: ${counts.people} people, ${counts.notes} notes, ${kb} KB zip; would email ${to ? mask(to) : "(BACKUP_EMAIL_TO not set)"}.`;
    return result;
  }

  await send({
    to: to!,
    subject: `[RNC] Planning Center backup ${day}`,
    text: [
      `Attached is this month's Planning Center backup (${day}): ${counts.people} people, ${counts.notes} notes, ${kb} KB.`,
      "",
      "It holds the church's contact details, so please save it somewhere private and delete this email afterwards. People's medical notes are not included.",
      "",
      "Sent automatically by the Roseville New Church website (Admin > Actions > Planning Center backup).",
    ].join("\n"),
    attachments: [{ name: `planning-center-backup-${day}.zip`, content: archive, type: "application/zip" }],
  });
  result.summary = `Backup emailed to ${mask(to!)}: ${counts.people} people, ${counts.notes} notes, ${kb} KB zip.`;
  return result;
}
