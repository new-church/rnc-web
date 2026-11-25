import type { Kv } from "./kv";
import type { ItemRow, PutItem } from "../items-table/types";

/**
 * In-memory stand-in for the items store (table index and gsi2 only, which is all the member code uses). Used by the
 * tests and, outside production, by the member pages so a local run never writes to the real database.
 */
export function memoryKv(clock: { now: number } = { now: Date.now() }): Kv & { rows: Map<string, ItemRow>; clock: { now: number } } {
  const rows = new Map<string, ItemRow>();
  const id = (pk: string, sk: string) => `${pk}\u0000${sk}`;
  const live = (r: ItemRow | undefined) => (r && (!r.expires_at || new Date(r.expires_at).getTime() > clock.now) ? r : null);

  const kv = {
    rows,
    clock,
    async get({ pk, sk }: { pk: string; sk: string }) {
      return live(rows.get(id(pk, sk)));
    },
    async put(i: PutItem) {
      const row = {
        pk: i.pk, sk: i.sk, entity_type: i.entityType, data: JSON.parse(JSON.stringify(i.data ?? {})),
        gsi1pk: null, gsi1sk: null, gsi2pk: i.gsi2?.pk ?? null, gsi2sk: i.gsi2?.sk ?? null, gsi3pk: null, gsi3sk: null,
        expires_at: i.ttl == null ? null : new Date(i.ttl as Date).toISOString(), created_at: "", updated_at: "",
      } as ItemRow;
      rows.set(id(i.pk, i.sk), row);
      return row;
    },
    async delete({ pk, sk }: { pk: string; sk: string }) {
      rows.delete(id(pk, sk));
    },
    async query(q: { index?: string; pk: string; sk?: { op: string; prefix?: string }; scanIndexForward?: boolean; limit?: number }) {
      const col = q.index === "gsi2" ? "gsi2" : "table";
      let items = [...rows.values()].filter((r) => live(r)).filter((r) => (col === "gsi2" ? r.gsi2pk === q.pk : r.pk === q.pk));
      if (q.sk?.op === "begins_with") items = items.filter((r) => r.sk.startsWith(q.sk!.prefix!));
      const sortKey = (r: ItemRow) => (col === "gsi2" ? r.gsi2sk! : r.sk);
      items.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      if (q.scanIndexForward === false) items.reverse();
      return { items: items.slice(0, q.limit ?? 50) };
    },
    async incr({ pk, sk }: { pk: string; sk: string }, ttlSeconds: number) {
      const cur = live(rows.get(id(pk, sk)));
      const count = cur ? Number(cur.data.count) + 1 : 1;
      rows.set(id(pk, sk), {
        pk, sk, entity_type: "counter", data: { count }, gsi1pk: null, gsi1sk: null, gsi2pk: null, gsi2sk: null, gsi3pk: null, gsi3sk: null,
        expires_at: cur?.expires_at ?? new Date(clock.now + ttlSeconds * 1000).toISOString(), created_at: "", updated_at: "",
      });
      return count;
    },
  };
  return kv as never;
}
