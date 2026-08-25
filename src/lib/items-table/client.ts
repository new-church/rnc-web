import { createItemsStoreFromApi, type ItemsStore } from "./store";

/** Fixed id for the migration sample member (`MEMBER#sample-ada` / `PROFILE`). */
export const SAMPLE_MEMBER_ID = "sample-ada";

function requiredEnv(name: string): string {
  const value =
    (typeof import.meta !== "undefined" &&
      (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
        .env?.[name]) ||
    process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local (and Vercel) from Supabase Project Settings → API.`,
    );
  }
  return value;
}

/** Server-only store. Never call from client components. */
export function createItemsStoreFromEnv(): ItemsStore {
  return createItemsStoreFromApi(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
  );
}
