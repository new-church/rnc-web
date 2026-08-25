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
};

export const ACTION_CATALOG: Omit<
  ActionMeta,
  "lastStatus" | "lastRunAt" | "lastActorEmail" | "lastMessage"
>[] = [
  {
    id: ACTION_IDS.mailchimpSync,
    label: "Sync to Mailchimp",
    description:
      "Push contacts to Mailchimp. Connect API keys later; for now this records a job.",
  },
  {
    id: ACTION_IDS.postgridSync,
    label: "Sync to PostGrid",
    description:
      "Push postal contacts to PostGrid for mailouts. Stub records a job until keys are connected.",
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
  return {
    ...catalog,
    lastStatus: data.lastStatus ? String(data.lastStatus) : null,
    lastRunAt: data.lastRunAt ? String(data.lastRunAt) : null,
    lastActorEmail: data.lastActorEmail ? String(data.lastActorEmail) : null,
    lastMessage: data.lastMessage ? String(data.lastMessage) : null,
  };
}

export async function listActionMetas(
  store: ItemsStore = createItemsStoreFromEnv(),
): Promise<ActionMeta[]> {
  return Promise.all(ACTION_CATALOG.map((a) => getActionMeta(a.id, store)));
}

/** Stub: write META + a RUN item. No external API calls. */
export async function recordActionRun(opts: {
  actionId: ActionId;
  actorEmail: string;
  store?: ItemsStore;
}): Promise<ActionMeta> {
  const store = opts.store ?? createItemsStoreFromEnv();
  const catalog = ACTION_CATALOG.find((a) => a.id === opts.actionId);
  if (!catalog) throw new Error(`Unknown action: ${opts.actionId}`);

  const now = new Date().toISOString();
  const runId = crypto.randomUUID().slice(0, 8);
  const message =
    "Stub run recorded. Wire Mailchimp/PostGrid API keys to perform a real sync.";

  await store.put({
    pk: ActionKeys.pk(opts.actionId),
    sk: ActionKeys.metaSk(),
    entityType: "action",
    data: {
      id: opts.actionId,
      label: catalog.label,
      lastStatus: "stub_ok",
      lastRunAt: now,
      lastActorEmail: opts.actorEmail,
      lastMessage: message,
    },
  });

  await store.put({
    pk: ActionKeys.pk(opts.actionId),
    sk: ActionKeys.runSk(now, runId),
    entityType: "action_run",
    data: {
      status: "stub_ok",
      actorEmail: opts.actorEmail,
      message,
      createdAt: now,
    },
  });

  return getActionMeta(opts.actionId, store);
}
