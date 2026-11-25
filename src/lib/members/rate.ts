import type { Kv } from './kv';
import { key } from '../items-table/keys';

/**
 * Fixed-window rate limit. Counts this attempt and says whether it is within `limit`.
 * `subject` is a hash (of an email or IP), never the raw value.
 */
export async function withinLimit(
  kv: Kv,
  kind: string,
  subject: string,
  rule: { limit: number; windowSeconds: number },
  now = Date.now(),
): Promise<boolean> {
  const windowStart = Math.floor(now / 1000 / rule.windowSeconds) * rule.windowSeconds;
  const count = await kv.incr({ pk: key('RATE', kind, subject), sk: `W${windowStart}` }, rule.windowSeconds + 300);
  return count <= rule.limit;
}
