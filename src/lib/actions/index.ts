import { key } from "../items-table/keys";
import type { ItemsStore } from "../items-table";
import { createItemsStoreFromEnv } from "../items-table";

export const ACTION_IDS = {
  mailchimpSync: "mailchimp_sync",
  postgridSync: "postgrid_sync",
} as const;

export type ActionId = (typeof ACTION_IDS)[keyof typeof ACTION_IDS];

export const ActionKeys = {
  pk: (actionId: string) => key("ACTION", actionId),
  metaSk: () => "META",
  runSk: (iso: string, runId: string) => key("RUN", iso, runId),
};

export type ActionMeta = {
  id: ActionId;
  label: string;
  description: string;
  lastStatus?: string | null;
  lastRunAt?: string | null;
  lastActorEmail?: string | null;
  lastMessage?: string | null;
  lastResult?: {
    attention?: string[];
    errors?: string[];
    lines?: string[];
  } | null;
  lastDryRun?: {
    at: string;
    summary: string;
    attention: string[];
    errors: string[];
    lines: string[];
  } | null;
};

export const ACTION_CATALOG: Omit<
  ActionMeta,
  "lastStatus" | "lastRunAt" | "lastActorEmail" | "lastMessage" | "lastResult" | "lastDryRun"
>[] = [
  {
    id: ACTION_IDS.mailchimpSync,
    label: "Sync to Mailchimp",
    description:
      "Planning Center to Mailchimp: add and update contacts, rename changed emails, set type: and tag: tags, pull unsubscribes back into Planning Center, and turn a cleared Unsubscribed flag into a resubscribe request. Runs daily.",
  },
  {
    id: ACTION_IDS.postgridSync,
    label: "Sync to PostGrid",
    description:
      "Planning Center to PostGrid: one contact per household and a mailing list per print run (Society news, Candela) and country hub. Nothing is mailed. Runs daily.",
  },
];

export async function getActionMeta(
  actionId: ActionId,
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<ActionMeta> {
  const catalog = ACTION_CATALOG.find((a) => a.id === actionId);
  if (!catalog) throw new Error(`Unknown action: ${actionId}`);

  const row = await store.get({
    pk: ActionKeys.pk(actionId),
    sk: ActionKeys.metaSk(),
  });
  const data = (row?.data ?? {}) as Record<string, unknown>;
  const dry = await store.get({ pk: ActionKeys.pk(actionId), sk: "DRYRUN" });
  const dryData = (dry?.data ?? null) as {
    at: string;
    result: { summary: string; attention: string[]; errors: string[]; lines: string[] };
  } | null;
  return {
    ...catalog,
    lastDryRun: dryData
      ? { at: dryData.at, summary: dryData.result.summary, attention: dryData.result.attention, errors: dryData.result.errors, lines: dryData.result.lines }
      : null,
    lastStatus: data.lastStatus ? String(data.lastStatus) : null,
    lastRunAt: data.lastRunAt ? String(data.lastRunAt) : null,
    lastActorEmail: data.lastActorEmail ? String(data.lastActorEmail) : null,
    lastMessage: data.lastMessage ? String(data.lastMessage) : null,
    lastResult: (data.lastResult as ActionMeta["lastResult"]) ?? null,
  };
}

export async function listActionMetas(
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<ActionMeta[]> {
  return Promise.all(ACTION_CATALOG.map((a) => getActionMeta(a.id, store)));
}
