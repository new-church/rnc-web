import { createItemsStoreFromApi, type ItemsStore } from "./store";
import { supabasePublicUrl, supabaseSecretKey } from "../env";

/** Fixed id for the migration sample member (`MEMBER#sample-ada` / `PROFILE`). */
export const SAMPLE_MEMBER_ID = "sample-ada";

/** Server-only store. Never call from client components. */
export function createItemsStoreFromEnv(): ItemsStore {
  return createItemsStoreFromApi(supabasePublicUrl(), supabaseSecretKey());
}
