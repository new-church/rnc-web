import { createHash } from "node:crypto";
import { ActionKeys, ACTION_IDS, type ActionId } from "../actions";
import { createItemsStoreFromEnv, type ItemsStore } from "../items-table";
import { Pco } from "./pco";
import { syncMailchimp } from "./mailchimp-sync";
import { syncPostGrid } from "./postgrid";
import { runBackup } from "./backup";
import { pingHealthcheck, sendAlert } from "./notify";
import { newResult, type JobResult } from "./util";

const LOCK_MINUTES = 10;
const MAX_LINES = 300;

export type RunOptions = {
  apply: boolean;
  trigger: "cron" | "admin" | "script";
  actorEmail?: string;
  store?: ItemsStore;
};

/** Run one sync, with a lock, a stored result, console logging and (on change) an alert email. */
export async function runJob(id: ActionId, opts: RunOptions): Promise<JobResult> {
  const store = opts.store ?? createItemsStoreFromEnv();
  const started = new Date();
  const pk = ActionKeys.pk(id);

  if (opts.apply) {
    const lock = await store.get({ pk, sk: "LOCK" });
    if (lock?.pk) {
      const r = newResult(true);
      r.status = "warning";
      r.summary = `Skipped: another run started at ${String((lock.data as { startedAt?: string }).startedAt ?? "?")} is still going.`;
      console.warn(JSON.stringify({ job: id, event: "skipped_locked" }));
      return r;
    }
    await store.put({ pk, sk: "LOCK", entityType: "lock", data: { startedAt: started.toISOString() }, ttl: new Date(Date.now() + LOCK_MINUTES * 60_000) });
  }

  let result: JobResult;
  try {
    const pco = Pco.fromEnv();
    result =
      id === ACTION_IDS.mailchimpSync
        ? await syncMailchimp({ apply: opts.apply, pco })
        : id === ACTION_IDS.pcoBackup
          ? await runBackup({ apply: opts.apply, pco })
          : await syncPostGrid({ apply: opts.apply, pco, store });
  } catch (e) {
    result = newResult(opts.apply);
    result.status = "error";
    result.errors.push(e instanceof Error ? e.message : String(e));
    result.summary = `Sync failed: ${result.errors[0]}`;
  } finally {
    if (opts.apply) await store.delete({ pk, sk: "LOCK" }).catch(() => undefined);
  }

  const durationMs = Date.now() - started.getTime();
  console.log(JSON.stringify({ job: id, event: "finished", apply: opts.apply, trigger: opts.trigger, status: result.status, durationMs, counts: result.counts, errors: result.errors.slice(0, 10), attention: result.attention.length }));

  if (opts.apply) {
    await recordAndAlert(id, store, result, opts, started, durationMs);
  } else {
    await store.put({ pk, sk: "DRYRUN", entityType: "action_dry_run", data: { at: started.toISOString(), actorEmail: opts.actorEmail ?? opts.trigger, result: { ...result, lines: result.lines.slice(0, MAX_LINES), errors: result.errors.slice(0, 50), attention: result.attention.slice(0, 100) } } });
  }
  return result;
}

async function recordAndAlert(id: ActionId, store: ItemsStore, result: JobResult, opts: RunOptions, started: Date, durationMs: number) {
  const pk = ActionKeys.pk(id);
  const prev = ((await store.get({ pk, sk: ActionKeys.metaSk() }))?.data ?? {}) as Record<string, unknown>;
  const attentionHash = createHash("sha1").update([...result.attention].sort().join("\n")).digest("hex");
  const trimmed = { ...result, lines: result.lines.slice(0, MAX_LINES), errors: result.errors.slice(0, 50), attention: result.attention.slice(0, 100) };
  const actor = opts.trigger === "cron" ? "cron" : (opts.actorEmail ?? opts.trigger);
  const at = started.toISOString();

  await store.put({
    pk,
    sk: ActionKeys.metaSk(),
    entityType: "action",
    data: { id, lastStatus: result.status, lastRunAt: at, lastActorEmail: actor, lastMessage: result.summary, lastResult: trimmed, lastAttentionHash: attentionHash, lastDurationMs: durationMs },
  });
  await store.put({
    pk,
    sk: ActionKeys.runSk(at, crypto.randomUUID().slice(0, 8)),
    entityType: "action_run",
    data: { status: result.status, actorEmail: actor, message: result.summary, createdAt: at, durationMs, result: trimmed },
    ttl: new Date(Date.now() + 90 * 86_400_000),
  });

  await pingHealthcheck(id, result.status !== "error");

  // Alert when something failed, when what needs attention has changed, or when things recover.
  const wasBad = prev.lastStatus === "error" || prev.lastStatus === "warning";
  const attentionChanged = result.attention.length > 0 && prev.lastAttentionHash !== attentionHash;
  const recovered = result.status === "ok" && wasBad;
  if (result.status === "error" || attentionChanged || recovered) {
    const label = id === ACTION_IDS.mailchimpSync ? "Mailchimp sync" : id === ACTION_IDS.pcoBackup ? "Planning Center backup" : "PostGrid sync";
    const subject = result.status === "error" ? `[RNC] ${label} FAILED` : recovered ? `[RNC] ${label} back to normal` : `[RNC] ${label}: needs a look`;
    const text = [result.summary, "", ...(result.errors.length ? ["Errors:", ...result.errors.map((e) => `  - ${e}`), ""] : []), ...(result.attention.length ? ["Needs attention:", ...result.attention.map((a) => `  - ${a}`), ""] : []), `Run at ${at} (${opts.trigger}, ${Math.round(durationMs / 1000)}s). Admin: /admin/actions`].join("\n");
    const sent = await sendAlert(subject, text).catch((e) => ({ sent: false, reason: String(e) }));
    console.log(JSON.stringify({ job: id, event: "alert", subject, ...sent }));
  }
}
