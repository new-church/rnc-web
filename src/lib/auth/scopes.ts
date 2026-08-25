/** Application permission scopes stored on USER#… / PROFILE items. */
export const SCOPES = {
  superAdmin: "super_admin",
  admin: "admin",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

export type AppUserData = {
  email: string;
  displayName?: string;
  scopes: string[];
  authUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasScope(
  scopes: string[] | undefined,
  required: Scope | Scope[],
): boolean {
  const set = new Set(scopes ?? []);
  const need = Array.isArray(required) ? required : [required];
  return need.some((s) => set.has(s));
}

export function isAdminScopes(scopes: string[] | undefined): boolean {
  return hasScope(scopes, [SCOPES.superAdmin, SCOPES.admin]);
}
