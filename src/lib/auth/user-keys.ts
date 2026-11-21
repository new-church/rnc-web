import { key } from "../items-table/keys";
import { normalizeEmail } from "./scopes";

/**
 * App login identity (permissions), separate from Planning Center contacts (not stored here).
 *
 * Access patterns:
 * - get: USER#{email} / PROFILE
 * - by email GSI1: EMAIL#{email} / USER
 * - list GSI2: USERS#rnc / EMAIL#{email}
 * - by auth uid GSI3: AUTH#{uid} / USER
 */
export const UserKeys = {
  pk: (email: string) => key("USER", normalizeEmail(email)),
  profileSk: () => "PROFILE",
  emailGsi1: (email: string) => ({
    pk: key("EMAIL", normalizeEmail(email)),
    sk: key("USER"),
  }),
  listGsi2: (email: string) => ({
    pk: key("USERS", "rnc"),
    sk: key("EMAIL", normalizeEmail(email)),
  }),
  listGsi2Pk: () => key("USERS", "rnc"),
  authGsi3: (authUserId: string) => ({
    pk: key("AUTH", authUserId),
    sk: key("USER"),
  }),
};
