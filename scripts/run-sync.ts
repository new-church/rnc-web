/**
 * Run a sync locally (dry run unless --apply). Reads .env.local; the Mailchimp and PostGrid keys can
 * come from another env file:
 *   node --import tsx --env-file=.env.local --env-file=../ssnc.mailchimp-sync/.env scripts/run-sync.ts mailchimp_sync
 *   ... scripts/run-sync.ts postgrid_sync --apply
 * Uses the same code as the cron job and the admin page.
 */
import { runJob } from "../src/lib/sync/runner";
import type { ActionId } from "../src/lib/actions";

const job = process.argv[2] as ActionId;
const apply = process.argv.includes("--apply");
if (job !== "mailchimp_sync" && job !== "postgrid_sync") {
  console.error("usage: run-sync.ts mailchimp_sync|postgrid_sync [--apply]");
  process.exit(2);
}
const result = await runJob(job, { apply, trigger: "script" });
console.log("\n" + result.summary);
console.log("counts:", JSON.stringify(result.counts));
for (const l of result.lines) console.log("  " + l);
if (result.attention.length) console.log("\nNeeds attention:\n" + result.attention.map((a) => "  - " + a).join("\n"));
if (result.errors.length) console.log("\nErrors:\n" + result.errors.map((a) => "  - " + a).join("\n"));
process.exit(result.status === "error" ? 1 : 0);
