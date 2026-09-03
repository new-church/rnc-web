import { z } from "zod";

const emptyStr = z.string().optional().default("");

/** Y/N/L/empty → string flag as stored (preserve L for SAA life members). */
export const ynFlagSchema = z.string().optional().default("");

export const contactAddressSchema = z.object({
  line1: emptyStr,
  line2: emptyStr,
  city: emptyStr,
  state: emptyStr,
  postalCode: emptyStr,
  /** Free-text overseas location from legacy OVERSEAS column when set. */
  overseas: emptyStr,
  overseasCountry: emptyStr,
});

export const contactPhonesSchema = z.object({
  home: emptyStr,
  mobile: emptyStr,
  work: emptyStr,
});

export const contactFlagsSchema = z.object({
  birthdaySend: ynFlagSchema,
  rncBirthdayChild: ynFlagSchema,
  mailchimp: ynFlagSchema,
  ncSocietyRep: ynFlagSchema,
  rncMembChildren: ynFlagSchema,
  rncMembCommittee: ynFlagSchema,
  rncMembThoughtElsewhere: ynFlagSchema,
  rncNonMembFromDirectory: ynFlagSchema,
  rncNonMembsGetAgmRpts: ynFlagSchema,
  saaConcession: ynFlagSchema,
  saaMember: ynFlagSchema,
  /** Copies of Candela newsletter (0, 1, 3, …). */
  candelas: emptyStr,
  /** Copies of RNC calendar. */
  rncCalendar: emptyStr,
  saaPaidToYear: emptyStr,
  saaSince: emptyStr,
  saaLastPaymentOrStatusChange: emptyStr,
  scLibrarySince: emptyStr,
});

export const contactDataSchema = z.object({
  title: emptyStr,
  firstName: emptyStr,
  lastName: emptyStr,
  /** Prefer this for display when set (e.g. "Mrs Lyn Rocke"). */
  titledCompleteName: emptyStr,
  /**
   * Required display label for tables / GSI sort.
   * Usually titledCompleteName or "First Last".
   */
  displayName: z.string().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Valid email required",
    }),
  phones: contactPhonesSchema.optional().default({
    home: "",
    mobile: "",
    work: "",
  }),
  address: contactAddressSchema.optional().default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    overseas: "",
    overseasCountry: "",
  }),
  birthday: emptyStr,
  birthYear: emptyStr,
  tags: z.array(z.string()).optional().default([]),
  notes: emptyStr,
  previousAddrEmail: emptyStr,
  flags: contactFlagsSchema.optional().default({
    birthdaySend: "",
    rncBirthdayChild: "",
    mailchimp: "",
    ncSocietyRep: "",
    rncMembChildren: "",
    rncMembCommittee: "",
    rncMembThoughtElsewhere: "",
    rncNonMembFromDirectory: "",
    rncNonMembsGetAgmRpts: "",
    saaConcession: "",
    saaMember: "",
    candelas: "",
    rncCalendar: "",
    saaPaidToYear: "",
    saaSince: "",
    saaLastPaymentOrStatusChange: "",
    scLibrarySince: "",
  }),
  /** Legacy Notion/Airtable "Record" label. */
  sourceRecord: emptyStr,
  mailchimpSyncedAt: z.string().nullable().optional().default(null),
  postgridSyncedAt: z.string().nullable().optional().default(null),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ContactAddress = z.infer<typeof contactAddressSchema>;
export type ContactPhones = z.infer<typeof contactPhonesSchema>;
export type ContactFlags = z.infer<typeof contactFlagsSchema>;
export type ContactData = z.infer<typeof contactDataSchema>;

export function buildDisplayName(data: {
  titledCompleteName?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  sourceRecord?: string;
}): string {
  const titled = data.titledCompleteName?.trim();
  if (titled) return titled;
  const parts = [data.title, data.firstName, data.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  const record = data.sourceRecord?.trim();
  if (record) return record;
  return "Unknown";
}

/** Sort key fragment: "lastname firstname" for directory GSI. */
export function sortNameFromContact(data: {
  lastName?: string;
  firstName?: string;
  displayName?: string;
}): string {
  const last = (data.lastName ?? "").trim().toLowerCase();
  const first = (data.firstName ?? "").trim().toLowerCase();
  if (last || first) return `${last} ${first}`.trim();
  return sortNameFromDisplayName(data.displayName ?? "unknown");
}

export function sortNameFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "unknown";
  if (parts.length === 1) return parts[0]!.toLowerCase();
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(" ");
  return `${last} ${first}`.toLowerCase();
}

/** Parse admin contact form POST body into ContactData. */
export function contactDataFromFormData(form: FormData): ContactData {
  const tags = String(form.get("tags") ?? "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const titledCompleteName = String(form.get("titledCompleteName") ?? "");
  const title = String(form.get("title") ?? "");
  const firstName = String(form.get("firstName") ?? "");
  const lastName = String(form.get("lastName") ?? "");
  const sourceRecord = String(form.get("sourceRecord") ?? "");

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
    email: String(form.get("email") ?? ""),
    phones: {
      home: String(form.get("phoneHome") ?? ""),
      mobile: String(form.get("phoneMobile") ?? ""),
      work: String(form.get("phoneWork") ?? ""),
    },
    address: {
      line1: String(form.get("line1") ?? ""),
      line2: String(form.get("line2") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      overseas: String(form.get("overseas") ?? ""),
      overseasCountry: String(form.get("overseasCountry") ?? ""),
    },
    birthday: String(form.get("birthday") ?? ""),
    birthYear: String(form.get("birthYear") ?? ""),
    tags,
    notes: String(form.get("notes") ?? ""),
    previousAddrEmail: String(form.get("previousAddrEmail") ?? ""),
    sourceRecord,
    flags: {
      birthdaySend: String(form.get("flagBirthdaySend") ?? ""),
      rncBirthdayChild: String(form.get("flagRncBirthdayChild") ?? ""),
      mailchimp: String(form.get("flagMailchimp") ?? ""),
      ncSocietyRep: String(form.get("flagNcSocietyRep") ?? ""),
      rncMembChildren: String(form.get("flagRncMembChildren") ?? ""),
      rncMembCommittee: String(form.get("flagRncMembCommittee") ?? ""),
      rncMembThoughtElsewhere: String(
        form.get("flagRncMembThoughtElsewhere") ?? "",
      ),
      rncNonMembFromDirectory: String(
        form.get("flagRncNonMembFromDirectory") ?? "",
      ),
      rncNonMembsGetAgmRpts: String(
        form.get("flagRncNonMembsGetAgmRpts") ?? "",
      ),
      saaConcession: String(form.get("flagSaaConcession") ?? ""),
      saaMember: String(form.get("flagSaaMember") ?? ""),
      candelas: String(form.get("flagCandelas") ?? ""),
      rncCalendar: String(form.get("flagRncCalendar") ?? ""),
      saaPaidToYear: String(form.get("flagSaaPaidToYear") ?? ""),
      saaSince: String(form.get("flagSaaSince") ?? ""),
      saaLastPaymentOrStatusChange: String(
        form.get("flagSaaLastPaymentOrStatusChange") ?? "",
      ),
      scLibrarySince: String(form.get("flagScLibrarySince") ?? ""),
    },
  });
}
