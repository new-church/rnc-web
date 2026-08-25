/** Convert a Dynamo-style TTL value to an ISO timestamptz string. */
export function ttlToIso(
  ttl: Date | number | string | null | undefined,
): string | null {
  if (ttl == null) return null;
  if (ttl instanceof Date) {
    if (Number.isNaN(ttl.getTime())) throw new Error("Invalid TTL Date");
    return ttl.toISOString();
  }
  if (typeof ttl === "string") {
    const d = new Date(ttl);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid TTL string: ${ttl}`);
    return d.toISOString();
  }
  const ms = ttl < 1e12 ? ttl * 1000 : ttl;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid TTL number: ${ttl}`);
  return d.toISOString();
}
