# Single-table store (Supabase / Postgres)

Dynamo-style **one table**, **PK + SK**, **three sparse GSIs**, **keyset pagination**, and **TTL**. The website CMS stays in git; this is for members / CRM / sessions.

Client: `src/lib/items-table/`  
Schema: `src/lib/items-table/sql/`

## Setup

1. Create a Supabase project.
2. Run [`sql/001_items.sql`](../src/lib/items-table/sql/001_items.sql) in the SQL editor.
3. Run [`sql/002_ttl_cron.sql`](../src/lib/items-table/sql/002_ttl_cron.sql) after enabling the **pg_cron** extension (Dashboard → Database → Extensions).
4. Add RLS policies before using the user `anon` / `authenticated` keys. Example: [`sql/003_rls.example.sql`](../src/lib/items-table/sql/003_rls.example.sql). The **service role** bypasses RLS (server-only).
5. Env (server):

```bash
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."   # API routes / admin only
# later, member login:
PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="..."
```

```ts
import { createClient } from "@supabase/supabase-js";
import { createItemsStore, MemberKeys } from "../lib/items-table";

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
);
const items = createItemsStore(supabase);
```

Never ship the service role key to the browser.

## Table shape

| Column | Role |
|---|---|
| `pk`, `sk` | Table primary key (partition + sort) |
| `entity_type` | Item discriminator (`member`, `note`, …) |
| `data` | JSON document (flexible attributes) |
| `gsi1pk` + `gsi1sk` | Sparse GSI 1 |
| `gsi2pk` + `gsi2sk` | Sparse GSI 2 |
| `gsi3pk` + `gsi3sk` | Sparse GSI 3 |
| `expires_at` | TTL; `null` = keep forever |
| `created_at`, `updated_at` | Audit |

Indexes:

- `PRIMARY KEY (pk, sk)` — Query on the table
- `(gsiNpk, gsiNsk, pk, sk) WHERE gsiNpk IS NOT NULL` — Query on GSI N; `(pk, sk)` are tie-breakers when GSI keys collide (Dynamo GSIs are not unique)
- `(expires_at) WHERE expires_at IS NOT NULL` — TTL sweeper

Every **Query** must be: **equality on the partition key of that index** + optional **range on its sort key**. Do not filter on `data` and expect Dynamo-like speed; add a GSI instead.

## Key design standard

### Grammar

- Separator is `#`. **No `#` inside a segment** (the `key()` helper rejects it).
- `TYPE#value` or `TYPE#value#value` (extra segments for uniqueness / sort).
- Sortable time: **ISO-8601 UTC** (`2026-08-25T03:00:00.000Z`).
- Emails: **trim + lowercase** before they go in a key.
- Human names in a sort key: lowercase; put `memberId` last so ties are stable.

Use `key("MEMBER", id)` rather than string concat.

### What lives where

- **Identity / list / sort** → `pk` / `sk` / GSI keys  
- **Flexible fields** → `data` JSON  
- **TTL** → `expires_at`, not a field inside `data`

### Recommended access patterns (membership)

| Pattern | Index | `pk` | `sk` |
|---|---|---|---|
| Get member profile | table | `MEMBER#{id}` | `PROFILE` |
| Notes for a member (time order) | table | `MEMBER#{id}` | `NOTE#{iso}#{noteId}` (`begins_with NOTE#`) |
| Household + members | table | `HOUSEHOLD#{id}` | `META` / `MEMBER#{memberId}` |
| Lookup by email | **GSI1** | `EMAIL#{email}` | `MEMBER` |
| Directory by name | **GSI2** | `DIR#rnc` | `NAME#{sortName}#{memberId}` |
| Sessions for a member | **GSI3** | `MEMBER#{id}` | `SESSION#{expiresIso}#{sessionId}` |
| Session get / TTL | table | `SESSION#{id}` | `META` |

Helpers: `MemberKeys`, `HouseholdKeys`, `SessionKeys`, `DirectoryKeys` in `design.ts`.

**GSI budget (3):** invert a unique lookup (email), one collection scan (directory), one extra collection (sessions / activity). A fourth pattern needs a new physical index (change the SQL), not another JSON field.

### Entity types

Set `entityType` on every `put` (`member`, `member_note`, `household`, `session`, …). Do not overload `sk = PROFILE` for two entity types under the same `pk`.

## API

### `put` (full replace)

Same as Dynamo `PutItem`: omitted GSI keys are **cleared**. Always pass every GSI the item should have.

```ts
import { MemberKeys, DirectoryKeys } from "../lib/items-table";

const id = crypto.randomUUID();
const email = "ada@example.com";
const sortName = "lovelace ada";

await items.put({
  pk: MemberKeys.pk(id),
  sk: MemberKeys.profileSk(),
  entityType: "member",
  data: { displayName: "Ada Lovelace", email, phone: null },
  gsi1: MemberKeys.emailGsi1(email),
  gsi2: {
    pk: DirectoryKeys.gsi2pk(),
    sk: DirectoryKeys.gsi2sk(sortName, id),
  },
  // no gsi3, no ttl
});
```

### `get`

```ts
const row = await items.get({
  pk: MemberKeys.pk(id),
  sk: MemberKeys.profileSk(),
});
// row.data, or null if missing / expired
```

Expired rows are **hidden** by default (`hideExpired: true`), which is stricter than Dynamo TTL (Dynamo can still return an item until the sweeper runs). Pass `hideExpired: false` to see tombstones still in the table.

### `query` + pagination

`exclusiveStartKey` / `lastEvaluatedKey` are opaque base64url cursors (Dynamo `ExclusiveStartKey` / `LastEvaluatedKey`). **No `OFFSET`.**

```ts
const page1 = await items.query({
  pk: MemberKeys.pk(id),
  sk: { op: "begins_with", prefix: "NOTE#" },
  limit: 20,
});

const page2 = await items.query({
  pk: MemberKeys.pk(id),
  sk: { op: "begins_with", prefix: "NOTE#" },
  limit: 20,
  exclusiveStartKey: page1.lastEvaluatedKey,
});
```

GSI:

```ts
const byEmail = await items.query({
  index: "gsi1",
  pk: MemberKeys.emailGsi1(email).pk,
  sk: { op: "eq", sk: "MEMBER" },
  limit: 1,
});
```

Directory page:

```ts
await items.query({
  index: "gsi2",
  pk: DirectoryKeys.gsi2pk(),
  sk: { op: "begins_with", prefix: "NAME#" },
  limit: 50,
  scanIndexForward: true,
});
```

Sort-key ops: `any` | `eq` | `begins_with` | `between` (inclusive) | `lt` | `lte` | `gt` | `gte`.

`scanIndexForward: false` = Dynamo reverse. Limit is capped at **1000** in SQL.

### `delete`

```ts
await items.delete({ pk: MemberKeys.pk(id), sk: MemberKeys.profileSk() });
```

## TTL

On `put`:

```ts
await items.put({
  pk: SessionKeys.pk(sessionId),
  sk: SessionKeys.sk(),
  entityType: "session",
  data: { memberId },
  gsi3: SessionKeys.memberGsi(memberId, expires.toISOString(), sessionId),
  ttl: expires, // Date, ISO string, Unix seconds, or Unix ms
});
```

Omit `ttl` or pass `null` to never expire.

**Reads:** `items_get` / `items_query` use database `now()` and skip expired rows when `hideExpired` is true.

**Deletes:** `002_ttl_cron.sql` removes up to 1000 expired rows every 5 minutes. Re-run the schedule SQL only once; unscheduling is commented in that file.

This is not a callback. If you need “on expire” side effects, add them in your app or a trigger on `DELETE`.

## Auth / RLS

`001` enables RLS and grants `authenticated` + `service_role`. With **no policies**, the browser key can do nothing; the service role still works.

Example policies in `003_rls.example.sql`:

- Authenticated user: only `MEMBER#{auth.uid()} / PROFILE`
- Admin: `app_metadata.role === "admin"`

Tighten before production (notes, households, etc.). RPCs are `SECURITY INVOKER`, so they obey RLS.

## What this is not

- Not ElectroDB: you compose keys in app code (`MemberKeys`).
- Not a CMS and not an admin GUI.
- Not Dynamo `BatchGet` / `TransactWrite` (add later if needed).
- `FilterExpression` on `data` is intentionally omitted so queries stay on indexes.

## Files

```
src/lib/items-table/
  index.ts          public API
  store.ts          get / put / delete / query
  types.ts
  keys.ts           key() + begins_with bounds
  cursor.ts         pagination tokens
  ttl.ts
  design.ts         recommended key helpers
  sql/001_items.sql
  sql/002_ttl_cron.sql
  sql/003_rls.example.sql
```
