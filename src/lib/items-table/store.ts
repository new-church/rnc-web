import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCursorMatches,
  cursorFromRow,
  encodeCursor,
  parseExclusiveStartKey,
} from "./cursor";
import { skConditionToBounds } from "./keys";
import { ttlToIso } from "./ttl";
import type {
  GetInput,
  IndexName,
  ItemRow,
  PutItem,
  QueryInput,
  QueryOutput,
} from "./types";

type GsiPair = { pk: string; sk: string } | null | undefined;

/** PutItem replaces the row (Dynamo PutItem). Omitted GSI keys are cleared. */
function gsiColumns(
  prefix: "gsi1" | "gsi2" | "gsi3",
  pair: GsiPair,
): Record<string, string | null> {
  if (!pair) {
    return { [`${prefix}pk`]: null, [`${prefix}sk`]: null };
  }
  return { [`${prefix}pk`]: pair.pk, [`${prefix}sk`]: pair.sk };
}

export class ItemsStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async get(input: GetInput): Promise<ItemRow | null> {
    const hideExpired = input.hideExpired ?? true;
    const { data, error } = await this.supabase.rpc("items_get", {
      p_pk: input.pk,
      p_sk: input.sk,
      p_hide_expired: hideExpired,
    });
    if (error) throw new Error(`items_get: ${error.message}`);
    return (data as ItemRow | null) ?? null;
  }

  async put(item: PutItem): Promise<ItemRow> {
    const row = {
      pk: item.pk,
      sk: item.sk,
      entity_type: item.entityType,
      data: item.data ?? {},
      expires_at: ttlToIso(item.ttl),
      ...gsiColumns("gsi1", item.gsi1),
      ...gsiColumns("gsi2", item.gsi2),
      ...gsiColumns("gsi3", item.gsi3),
    };

    const { data, error } = await this.supabase
      .from("items")
      .upsert(row, { onConflict: "pk,sk" })
      .select()
      .single();

    if (error) throw new Error(`items put: ${error.message}`);
    return data as ItemRow;
  }

  async delete(key: { pk: string; sk: string }): Promise<void> {
    const { error } = await this.supabase
      .from("items")
      .delete()
      .eq("pk", key.pk)
      .eq("sk", key.sk);
    if (error) throw new Error(`items delete: ${error.message}`);
  }

  async query(input: QueryInput): Promise<QueryOutput> {
    const index: IndexName = input.index ?? "table";
    const hideExpired = input.hideExpired ?? true;
    const forward = input.scanIndexForward ?? true;
    const limit = input.limit ?? 50;
    const sk = input.sk ?? { op: "any" as const };
    const bounds = skConditionToBounds(sk);
    const cursor = parseExclusiveStartKey(input.exclusiveStartKey);
    assertCursorMatches(index, input.pk, cursor);

    const { data, error } = await this.supabase.rpc("items_query", {
      p_index: index,
      p_pk: input.pk,
      p_sk_min: bounds.min,
      p_sk_max: bounds.max,
      p_sk_min_inclusive: bounds.minInclusive,
      p_sk_max_inclusive: bounds.maxInclusive,
      p_limit: limit,
      p_forward: forward,
      p_after_gsi_sk:
        cursor && cursor.index !== "table" ? cursor.gsiSk : null,
      p_after_pk: cursor && cursor.index !== "table" ? cursor.pk : null,
      p_after_sk: cursor ? cursor.sk : null,
      p_hide_expired: hideExpired,
    });

    if (error) throw new Error(`items_query: ${error.message}`);
    const items = (data as ItemRow[] | null) ?? [];
    const last =
      items.length === limit
        ? encodeCursor(cursorFromRow(index, items[items.length - 1]))
        : undefined;
    return { items, lastEvaluatedKey: last };
  }
}

export function createItemsStore(client: SupabaseClient): ItemsStore {
  return new ItemsStore(client);
}
