import type { ContactData } from "./schema";
import { buildDisplayName, contactDataSchema } from "./schema";
import { z } from "zod";

/** CSV column headers from the SSNC Notion/Airtable export (export order). */
export const SSNC_CSV_HEADERS = [
  "Record",
  "Address Line 1",
  "Address Line 2",
  "BIRTHDAY SEND",
  "Birth Year",
  "Birthday",
  "CANDELAS",
  "CONTACT HIST NOTES",
  "City",
  "Email",
  "First Name",
  "Home",
  "Last Name",
  "MAILCHIMP",
  "Mobile",
  "NC SOCIETY REP",
  "OVERSEAS",
  "Overseas Country",
  "PREVIOUS ADDR/EMAIL",
  "Postcode",
  "RNC BIRTHDAY CHILD",
  "RNC CALENDAR",
  "RNC MEMB: CHILDREN",
  "RNC MEMB: COMMITTEE",
  "RNC MEMB: THOUGHT TO BE MEMBS ELSEWHERE",
  "RNC NON-MEMB CONTACTS FROM DIRECTORY",
  "RNC NON-MEMBS GET AGM RPTS",
  "SAA CONCESSION",
  "SAA DATE OF LAST MEMB PAYMENT OR STATUS CHANGE",
  "SAA MEMBER",
  "SAA PAID-TO YEAR",
  "SAA SINCE",
  "SC LIBRARY SINCE",
  "State",
  "Tags",
  "Title",
  "Titled Complete Name",
  "Work Phone",
] as const;

export type SsncCsvHeader = (typeof SSNC_CSV_HEADERS)[number];

/** CSV column headers from the SSNC Notion/Airtable export. */
export type SsncCsvRow = Record<string, string>;

function cell(row: SsncCsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim() !== "") {
      return String(direct).trim();
    }
    // BOM on first header
    const bomKey = Object.keys(row).find(
      (k) => k.replace(/^\uFEFF/, "") === key,
    );
    if (bomKey) {
      const v = row[bomKey];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

function parseTags(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Map one SSNC Contacts CSV row → ContactData. */
export function contactDataFromSsncCsvRow(row: SsncCsvRow): ContactData {
  const title = cell(row, "Title");
  const firstName = cell(row, "First Name");
  const lastName = cell(row, "Last Name");
  const titledCompleteName = cell(row, "Titled Complete Name");
  const sourceRecord = cell(row, "Record");
  const rawEmail = cell(row, "Email").toLowerCase();
  const emailOk = !rawEmail || z.string().email().safeParse(rawEmail).success;
  const email = emailOk ? rawEmail : "";

  return contactDataSchema.parse({
    title,
    firstName,
    lastName,
    titledCompleteName,
    displayName: buildDisplayName({
      titledCompleteName,
      title,
      firstName,
      lastName,
      sourceRecord,
    }),
    email,

    phones: {
      home: cell(row, "Home"),
      mobile: cell(row, "Mobile"),
      work: cell(row, "Work Phone"),
    },
    address: {
      line1: cell(row, "Address Line 1"),
      line2: cell(row, "Address Line 2"),
      city: cell(row, "City"),
      state: cell(row, "State"),
      postalCode: cell(row, "Postcode"),
      overseas: cell(row, "OVERSEAS"),
      overseasCountry: cell(row, "Overseas Country"),
    },
    birthday: cell(row, "Birthday"),
    birthYear: cell(row, "Birth Year"),
    tags: parseTags(cell(row, "Tags")),
    notes: cell(row, "CONTACT HIST NOTES"),
    previousAddrEmail: cell(row, "PREVIOUS ADDR/EMAIL"),
    sourceRecord,
    flags: {
      birthdaySend: cell(row, "BIRTHDAY SEND"),
      rncBirthdayChild: cell(row, "RNC BIRTHDAY CHILD"),
      mailchimp: cell(row, "MAILCHIMP"),
      ncSocietyRep: cell(row, "NC SOCIETY REP"),
      rncMembChildren: cell(row, "RNC MEMB: CHILDREN"),
      rncMembCommittee: cell(row, "RNC MEMB: COMMITTEE"),
      rncMembThoughtElsewhere: cell(
        row,
        "RNC MEMB: THOUGHT TO BE MEMBS ELSEWHERE",
      ),
      rncNonMembFromDirectory: cell(
        row,
        "RNC NON-MEMB CONTACTS FROM DIRECTORY",
      ),
      rncNonMembsGetAgmRpts: cell(row, "RNC NON-MEMBS GET AGM RPTS"),
      saaConcession: cell(row, "SAA CONCESSION"),
      saaMember: cell(row, "SAA MEMBER"),
      candelas: cell(row, "CANDELAS"),
      rncCalendar: cell(row, "RNC CALENDAR"),
      saaPaidToYear: cell(row, "SAA PAID-TO YEAR"),
      saaSince: cell(row, "SAA SINCE"),
      saaLastPaymentOrStatusChange: cell(
        row,
        "SAA DATE OF LAST MEMB PAYMENT OR STATUS CHANGE",
      ),
      scLibrarySince: cell(row, "SC LIBRARY SINCE"),
    },
  });
}

/** Map ContactData → one SSNC CSV row (inverse of contactDataFromSsncCsvRow). */
export function contactDataToSsncCsvRow(data: ContactData): SsncCsvRow {
  const flags = data.flags ?? {};
  const phones = data.phones ?? {};
  const address = data.address ?? {};
  return {
    Record: data.sourceRecord ?? "",
    "Address Line 1": address.line1 ?? "",
    "Address Line 2": address.line2 ?? "",
    "BIRTHDAY SEND": flags.birthdaySend ?? "",
    "Birth Year": data.birthYear ?? "",
    Birthday: data.birthday ?? "",
    CANDELAS: flags.candelas ?? "",
    "CONTACT HIST NOTES": data.notes ?? "",
    City: address.city ?? "",
    Email: data.email ?? "",
    "First Name": data.firstName ?? "",
    Home: phones.home ?? "",
    "Last Name": data.lastName ?? "",
    MAILCHIMP: flags.mailchimp ?? "",
    Mobile: phones.mobile ?? "",
    "NC SOCIETY REP": flags.ncSocietyRep ?? "",
    OVERSEAS: address.overseas ?? "",
    "Overseas Country": address.overseasCountry ?? "",
    "PREVIOUS ADDR/EMAIL": data.previousAddrEmail ?? "",
    Postcode: address.postalCode ?? "",
    "RNC BIRTHDAY CHILD": flags.rncBirthdayChild ?? "",
    "RNC CALENDAR": flags.rncCalendar ?? "",
    "RNC MEMB: CHILDREN": flags.rncMembChildren ?? "",
    "RNC MEMB: COMMITTEE": flags.rncMembCommittee ?? "",
    "RNC MEMB: THOUGHT TO BE MEMBS ELSEWHERE":
      flags.rncMembThoughtElsewhere ?? "",
    "RNC NON-MEMB CONTACTS FROM DIRECTORY":
      flags.rncNonMembFromDirectory ?? "",
    "RNC NON-MEMBS GET AGM RPTS": flags.rncNonMembsGetAgmRpts ?? "",
    "SAA CONCESSION": flags.saaConcession ?? "",
    "SAA DATE OF LAST MEMB PAYMENT OR STATUS CHANGE":
      flags.saaLastPaymentOrStatusChange ?? "",
    "SAA MEMBER": flags.saaMember ?? "",
    "SAA PAID-TO YEAR": flags.saaPaidToYear ?? "",
    "SAA SINCE": flags.saaSince ?? "",
    "SC LIBRARY SINCE": flags.scLibrarySince ?? "",
    State: address.state ?? "",
    Tags: (data.tags ?? []).join(", "),
    Title: data.title ?? "",
    "Titled Complete Name": data.titledCompleteName ?? "",
    "Work Phone": phones.work ?? "",
  };
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialize contacts to SSNC-format CSV (with UTF-8 BOM for Excel). */
export function contactsToSsncCsv(contacts: ContactData[]): string {
  const lines: string[] = [
    SSNC_CSV_HEADERS.map((h) => escapeCsvField(h)).join(","),
  ];
  for (const data of contacts) {
    const row = contactDataToSsncCsvRow(data);
    lines.push(
      SSNC_CSV_HEADERS.map((h) => escapeCsvField(row[h] ?? "")).join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
