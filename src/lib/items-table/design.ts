import { key } from "./keys";

/**
 * Recommended key builders for a church membership single table.
 * Access patterns are listed in `docs/items-table.md`.
 */
export const MemberKeys = {
  pk: (memberId: string) => key("MEMBER", memberId),
  profileSk: () => "PROFILE",
  noteSk: (createdAtIso: string, noteId: string) =>
    key("NOTE", createdAtIso, noteId),
  emailGsi1: (email: string) => ({
    pk: key("EMAIL", email.trim().toLowerCase()),
    sk: key("MEMBER"),
  }),
};

export const HouseholdKeys = {
  pk: (householdId: string) => key("HOUSEHOLD", householdId),
  metaSk: () => "META",
  memberSk: (memberId: string) => key("MEMBER", memberId),
};

export const SessionKeys = {
  pk: (sessionId: string) => key("SESSION", sessionId),
  sk: () => "META",
  memberGsi: (memberId: string, expiresAtIso: string, sessionId: string) => ({
    pk: key("MEMBER", memberId),
    sk: key("SESSION", expiresAtIso, sessionId),
  }),
};

/** Directory listing: all profiles under one church partition on GSI2. */
export const DirectoryKeys = {
  gsi2pk: () => key("DIR", "rnc"),
  gsi2sk: (sortName: string, memberId: string) =>
    key("NAME", sortName.toLowerCase(), memberId),
};
