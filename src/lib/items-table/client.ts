import { createItemsStoreFromApi, type ItemsStore } from "./store";
import { supabasePublicUrl, supabaseSecretKey } from "../env";

/** Server-only store. Never call from client components. */
export function createItemsStoreFromEnv(): ItemsStore {
  return createItemsStoreFromApi(supabasePublicUrl(), supabaseSecretKey());
}
