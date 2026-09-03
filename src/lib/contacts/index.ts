import type { ItemRow, ItemsStore } from "../items-table";
import {
  DirectoryKeys,
  MemberKeys,
  createItemsStoreFromEnv,
} from "../items-table";
import { normalizeEmail } from "../auth/scopes";
import {
  type ContactData,
  contactDataSchema,
  sortNameFromContact,
} from "./schema";

export type Contact = {
  id: string;
  row: ItemRow;
  data: ContactData;
};

function memberIdFromPk(pk: string): string {
  const prefix = "MEMBER#";
  if (!pk.startsWith(prefix)) {
    throw new Error(`Unexpected member pk: ${pk}`);
  }
  return pk.slice(prefix.length);
}

function parseContact(row: ItemRow): Contact {
  const raw = row.data as Record<string, unknown>;
  // Migrate legacy single `phone` field into phones.mobile if needed.
  if (!raw.phones && typeof raw.phone === "string" && raw.phone) {
    raw.phones = { home: "", mobile: raw.phone, work: "" };
  }
  const parsed = contactDataSchema.safeParse(raw);
  const data = parsed.success
    ? parsed.data
    : contactDataSchema.parse({
        displayName: String(raw.displayName ?? "Unknown"),
        email: String(raw.email ?? ""),
        notes: String(raw.notes ?? raw.note ?? ""),
      });
  return {
    id: memberIdFromPk(row.pk),
    row,
    data,
  };
}

export async function listContacts(
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<Contact[]> {
  const { items } = await store.query({
    index: "gsi2",
    pk: DirectoryKeys.gsi2pk(),
    sk: { op: "begins_with", prefix: "NAME#" },
    limit: 1000,
  });
  return items
    .filter((row) => row.entity_type === "member" && row.sk === "PROFILE")
    .map(parseContact);
}

export async function getContact(
  id: string,
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<Contact | null> {
  const row = await store.get({
    pk: MemberKeys.pk(id),
    sk: MemberKeys.profileSk(),
  });
  if (!row || row.entity_type !== "member") return null;
  return parseContact(row);
}

export async function putContact(opts: {
  id: string;
  data: ContactData;
  createdAt?: string;
  store?: ItemsStore;
}): Promise<Contact> {
  const store = opts.store ?? createItemsStoreFromEnv();
  const now = new Date().toISOString();
  const email = opts.data.email ? normalizeEmail(opts.data.email) : "";
  const payload: ContactData = {
    ...opts.data,
    email,
    updatedAt: now,
    createdAt: opts.createdAt ?? opts.data.createdAt ?? now,
  };

  const sortName = sortNameFromContact(payload);
  const row = await store.put({
    pk: MemberKeys.pk(opts.id),
    sk: MemberKeys.profileSk(),
    entityType: "member",
    data: payload,
    gsi1: email ? MemberKeys.emailGsi1(email) : null,
    gsi2: {
      pk: DirectoryKeys.gsi2pk(),
      sk: DirectoryKeys.gsi2sk(sortName, opts.id),
    },
    gsi3: null,
  });

  return parseContact(row);
}

export async function deleteContact(
  id: string,
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<void> {
  await store.delete({
    pk: MemberKeys.pk(id),
    sk: MemberKeys.profileSk(),
  });
}

export {
  SSNC_CSV_HEADERS,
  contactDataFromSsncCsvRow,
  contactDataToSsncCsvRow,
  contactsToSsncCsv,
} from "./csv";
export {
  buildDisplayName,
  contactDataFromFormData,
  contactDataSchema,
  sortNameFromContact,
} from "./schema";
export type { ContactData } from "./schema";
