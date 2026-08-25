/** Segment separator. Values must not contain this character. */
export const KEY_SEP = "#";

/**
 * Build a Dynamo-style key from typed segments: `MEMBER#uuid`, `NOTE#2026-08-25T00:00:00.000Z#id`.
 * Encode sortable timestamps as ISO-8601 UTC. Zero-pad numbers.
 */
export function key(...segments: Array<string | number>): string {
  const parts = segments.map((s) => String(s));
  for (const part of parts) {
    if (part.length === 0) {
      throw new Error("items-table key segment must not be empty");
    }
    if (part.includes(KEY_SEP)) {
      throw new Error(
        `items-table key segment must not contain "${KEY_SEP}": ${part}`,
      );
    }
  }
  return parts.join(KEY_SEP);
}

export function parseKey(value: string): string[] {
  if (!value) return [];
  return value.split(KEY_SEP);
}

/** Exclusive upper bound for `begins_with(prefix)` using a btree range. */
export function beginsWithUpperBound(prefix: string): string {
  return prefix + "\u{10FFFF}";
}

export type SkBounds = {
  min: string | null;
  max: string | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export function skConditionToBounds(
  condition: { op: string; sk?: string; prefix?: string; from?: string; to?: string } = {
    op: "any",
  },
): SkBounds {
  switch (condition.op) {
    case "any":
      return { min: null, max: null, minInclusive: true, maxInclusive: false };
    case "eq":
      return {
        min: condition.sk ?? null,
        max: condition.sk ?? null,
        minInclusive: true,
        maxInclusive: true,
      };
    case "begins_with": {
      const prefix = condition.prefix ?? "";
      if (!prefix) {
        return { min: null, max: null, minInclusive: true, maxInclusive: false };
      }
      return {
        min: prefix,
        max: beginsWithUpperBound(prefix),
        minInclusive: true,
        maxInclusive: false,
      };
    }
    case "between":
      return {
        min: condition.from ?? null,
        max: condition.to ?? null,
        minInclusive: true,
        maxInclusive: true,
      };
    case "lt":
      return {
        min: null,
        max: condition.sk ?? null,
        minInclusive: true,
        maxInclusive: false,
      };
    case "lte":
      return {
        min: null,
        max: condition.sk ?? null,
        minInclusive: true,
        maxInclusive: true,
      };
    case "gt":
      return {
        min: condition.sk ?? null,
        max: null,
        minInclusive: false,
        maxInclusive: false,
      };
    case "gte":
      return {
        min: condition.sk ?? null,
        max: null,
        minInclusive: true,
        maxInclusive: false,
      };
    default:
      throw new Error(`Unknown sk condition: ${condition.op}`);
  }
}
