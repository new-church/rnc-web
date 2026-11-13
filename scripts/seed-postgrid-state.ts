/**
 * One-off: copy the PostGrid state kept by ssnc.mailchimp-sync (.postgrid_pco_state.json, live
 * section) into the items table so the first cron run does not rewrite every contact.
 *   node --import tsx --env-file=.env.local scripts/seed-postgrid-state.ts ../ssnc.mailchimp-sync/.postgrid_pco_state.json
 */
import { readFileSync } from "node:fs";
import { createItemsStoreFromEnv } from "../src/lib/items-table";
import { POSTGRID_STATE_KEY } from "../src/lib/sync/postgrid";

const file = process.argv[2];
if (!file) {
  console.error("usage: seed-postgrid-state.ts <path to .postgrid_pco_state.json>");
  process.exit(2);
}
const live = JSON.parse(readFileSync(file, "utf8")).live;
const store = createItemsStoreFromEnv();
const existing = await store.get(POSTGRID_STATE_KEY);
if (existing?.pk) {
  console.error("State already exists in the items table; not overwriting.");
  process.exit(1);
}
await store.put({ ...POSTGRID_STATE_KEY, entityType: "sync_state", data: { contacts: live.contacts, lists: live.lists, members: live.members } });
console.log(`Seeded ${Object.keys(live.contacts).length} contacts, ${Object.keys(live.lists).length} lists.`);
