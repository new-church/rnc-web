import type { ItemRow, ItemsStore } from "../items-table";
import { createItemsStoreFromEnv } from "../items-table";
import {
  type AppUserData,
  type Scope,
  isAdminScopes,
  normalizeEmail,
} from "./scopes";
import { UserKeys } from "./user-keys";

function parseUserData(row: ItemRow): AppUserData {
  const data = row.data as Partial<AppUserData>;
  return {
    email: normalizeEmail(String(data.email ?? "")),
    displayName: data.displayName ? String(data.displayName) : undefined,
    scopes: Array.isArray(data.scopes)
      ? data.scopes.map(String)
      : [],
    authUserId: data.authUserId ? String(data.authUserId) : null,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export type AppUser = {
  row: ItemRow;
  data: AppUserData;
};

async function putUser(
  store: ItemsStore,
  email: string,
  data: AppUserData,
): Promise<AppUser> {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();
  const payload: AppUserData = {
    ...data,
    email: normalized,
    scopes: data.scopes,
    updatedAt: now,
    createdAt: data.createdAt ?? now,
  };

  const row = await store.put({
    pk: UserKeys.pk(normalized),
    sk: UserKeys.profileSk(),
    entityType: "user",
    data: payload,
    gsi1: UserKeys.emailGsi1(normalized),
    gsi2: UserKeys.listGsi2(normalized),
    gsi3: payload.authUserId
      ? UserKeys.authGsi3(payload.authUserId)
      : null,
  });

  return { row, data: parseUserData(row) };
}

export async function getAppUserByEmail(
  email: string,
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<AppUser | null> {
  const row = await store.get({
    pk: UserKeys.pk(email),
    sk: UserKeys.profileSk(),
  });
  if (!row) return null;
  return { row, data: parseUserData(row) };
}

export async function getAppUserByAuthId(
  authUserId: string,
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<AppUser | null> {
  const { items } = await store.query({
    index: "gsi3",
    pk: UserKeys.authGsi3(authUserId).pk,
    sk: { op: "eq", sk: "USER" },
    limit: 1,
  });
  const row = items[0];
  if (!row) return null;
  return { row, data: parseUserData(row) };
}

export async function listAppUsers(
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<AppUser[]> {
  const { items } = await store.query({
    index: "gsi2",
    pk: UserKeys.listGsi2Pk(),
    sk: { op: "begins_with", prefix: "EMAIL#" },
    limit: 200,
  });
  return items
    .filter((row) => row.entity_type === "user")
    .map((row) => ({ row, data: parseUserData(row) }));
}

/**
 * After OTP verify: link auth uid onto the USER# row.
 * Scopes are never granted here — seed or an admin must set them.
 * Unprovisioned emails get a row with empty scopes (visible in /admin/users).
 */
export async function ensureAppUserAfterLogin(opts: {
  email: string;
  authUserId: string;
  displayName?: string | null;
}): Promise<AppUser> {
  const store = createItemsStoreFromEnv();
  const email = normalizeEmail(opts.email);
  const existing = await getAppUserByEmail(email, store);

  return putUser(store, email, {
    email,
    displayName:
      opts.displayName ||
      existing?.data.displayName ||
      email.split("@")[0],
    scopes: existing?.data.scopes ?? [],
    authUserId: opts.authUserId,
    createdAt: existing?.data.createdAt,
  });
}

export function userHasAdminAccess(user: AppUser | null): boolean {
  return isAdminScopes(user?.data.scopes);
}

export function userHasScope(user: AppUser | null, scope: Scope): boolean {
  return Boolean(user && (user.data.scopes ?? []).includes(scope));
}
