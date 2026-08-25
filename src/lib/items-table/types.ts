/** Physical row in `public.items`. */
export type ItemRow = {
  pk: string;
  sk: string;
  entity_type: string;
  data: Record<string, unknown>;
  gsi1pk: string | null;
  gsi1sk: string | null;
  gsi2pk: string | null;
  gsi2sk: string | null;
  gsi3pk: string | null;
  gsi3sk: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IndexName = "table" | "gsi1" | "gsi2" | "gsi3";

/** Dynamo-style sort-key condition on the active index. */
export type SkCondition =
  | { op: "any" }
  | { op: "eq"; sk: string }
  | { op: "begins_with"; prefix: string }
  | { op: "between"; from: string; to: string }
  | { op: "lt" | "lte" | "gt" | "gte"; sk: string };

export type TableCursor = {
  index: "table";
  pk: string;
  sk: string;
};

export type GsiCursor = {
  index: "gsi1" | "gsi2" | "gsi3";
  gsiPk: string;
  gsiSk: string;
  pk: string;
  sk: string;
};

export type Cursor = TableCursor | GsiCursor;

export type PutItem = {
  pk: string;
  sk: string;
  entityType: string;
  data?: Record<string, unknown>;
  gsi1?: { pk: string; sk: string } | null;
  gsi2?: { pk: string; sk: string } | null;
  gsi3?: { pk: string; sk: string } | null;
  /**
   * Dynamo-style TTL. `null` / omit = never expire.
   * `number`: Unix seconds if &lt; 1e12, otherwise milliseconds.
   */
  ttl?: Date | number | string | null;
};

export type QueryInput = {
  index?: IndexName;
  pk: string;
  sk?: SkCondition;
  limit?: number;
  exclusiveStartKey?: Cursor | string | null;
  scanIndexForward?: boolean;
  /** Default true: hide rows with `expires_at <= now()`. */
  hideExpired?: boolean;
};

export type QueryOutput = {
  items: ItemRow[];
  lastEvaluatedKey?: string;
};

export type GetInput = {
  pk: string;
  sk: string;
  hideExpired?: boolean;
};
