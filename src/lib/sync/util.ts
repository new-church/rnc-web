export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function qs(query?: Record<string, string | number | undefined>): string {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** YYYY-MM-DD in Sydney time for an ISO timestamp ("" if unparseable). */
export function sydneyDate(iso: string | Date | undefined | null): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function splitIds(s: unknown): string[] {
  return [
    ...new Set(
      String(s ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function cleanName(s: string | undefined | null): string {
  const t = (s ?? "").trim();
  return t === "-" ? "" : t;
}

export function personName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/** Human result of a sync run, stored in the items table and used for alerts. */
export type JobResult = {
  status: "ok" | "warning" | "error";
  applied: boolean;
  summary: string;
  counts: Record<string, number>;
  /** Things a person should look at (not failures). */
  attention: string[];
  /** Individual operations that failed. */
  errors: string[];
  /** Detail lines for the admin page / logs. */
  lines: string[];
};

export function newResult(applied: boolean): JobResult {
  return { status: "ok", applied, summary: "", counts: {}, attention: [], errors: [], lines: [] };
}

/** Run one operation; record a failure instead of aborting the whole run. */
export async function attempt(
  result: JobResult,
  label: string,
  fn: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    result.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    return false;
  }
}
