export function env(name: string): string | undefined {
  const fromMeta =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
          .env?.[name]
      : undefined;
  return fromMeta || process.env[name] || undefined;
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local and Vercel.`);
  }
  return value;
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return undefined;
}

/**
 * Project URL. Prefer Vercel/Supabase integration names; PUBLIC_ is optional.
 * Ignore POSTGRES_* — this app uses the Data API only.
 */
export function supabasePublicUrl(): string {
  const url = firstEnv("SUPABASE_URL", "PUBLIC_SUPABASE_URL");
  if (!url) {
    throw new Error("Missing SUPABASE_URL.");
  }
  return url;
}

/**
 * Anon / publishable key for Auth + RLS-scoped clients (OTP login cookies).
 * Same value whether named SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY.
 */
export function supabaseAnonKey(): string {
  const key = firstEnv(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "PUBLIC_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  if (!key) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY). From the Vercel Supabase integration or Project Settings → API.",
    );
  }
  return key;
}

/** Secret / service_role — server only; bypasses RLS. */
export function supabaseSecretKey(): string {
  const key = firstEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return key;
}
