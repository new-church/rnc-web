/**
 * Planning Center People -> PostGrid (live). One PostGrid contact per household, and one mailing
 * list per print run per fulfilment hub. Port of ssnc.mailchimp-sync/pco_to_postgrid.py.
 *
 *   runs:  "Society news (printed)" -> society-news,  "Candela (printed)" -> candela
 *   hubs:  AU, GB, CA, and "US & Intl." for everywhere else
 *
 * A household is mailed once when anyone in it is ticked for a run. The name line has no titles:
 * adults, primary contact first ("David & Shaaron Bartnik"; different surnames get full names; the
 * same person entered twice is named once). It falls back to the Planning Center household name
 * when no good name can be derived (no usable names, or more than 3 adults).
 *
 * Nothing is ever sent: this only maintains contacts and mailing lists for you to mail from PostGrid.
 */
import { createHash } from "node:crypto";
import type { ItemsStore } from "../items-table";
import { requireEnv } from "../env";
import { loadHouseholds, loadSnapshot, type J, type Pco, type PcoAddress, type PcoHousehold, type PcoPerson, type PcoSnapshot } from "./pco";
import { attempt, cleanName, newResult, qs, sleep, type JobResult } from "./util";

const BASE = "https://api.postgrid.com/print-mail/v1";
const SOURCE = "ssnc-pco";
const RUNS: Record<string, string> = { "Society news (printed)": "society-news", "Candela (printed)": "candela" };
const RUN_NAMES: Record<string, string> = { "society-news": "Society news (printed)", candela: "Candela (printed)" };
const HUB_NAMES: Record<string, string> = { AU: "AU", GB: "GB", CA: "CA", US: "US & Intl." };
const FULFILLMENT_HUBS = new Set(["AU", "GB", "CA"]);

export const hubFor = (country: string) => (FULFILLMENT_HUBS.has(country) ? country : "US");

export class PostGrid {
  constructor(private apiKey: string) {}

  static live(): PostGrid {
    return new PostGrid(requireEnv("POSTGRID_PRINT_MAIL_API_KEY"));
  }

  async request(method: string, path: string, body?: unknown, query?: Record<string, string | number>): Promise<J | null> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(BASE + path + qs(query), {
        method,
        headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.status === 429) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      if (r.status === 404 && (method === "GET" || method === "DELETE")) return null;
      if (!r.ok) throw new PostGridError(r.status, `PostGrid ${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      if (r.status === 204) return {};
      const text = await r.text();
      return text ? JSON.parse(text) : {};
    }
    throw new Error(`PostGrid ${method} ${path} rate limit retries exhausted`);
  }

  async list(path: string): Promise<J[]> {
    const out: J[] = [];
    for (let skip = 0; ; skip += 100) {
      const r = await this.request("GET", path, undefined, { limit: 100, skip });
      const items: J[] = r?.data ?? [];
      out.push(...items);
      if (!items.length || skip + 100 >= (r?.totalCount ?? 0)) return out;
    }
  }

  async waitList(id: string): Promise<J> {
    for (let i = 0; i < 90; i++) {
      const ml = await this.request("GET", `/mailing_lists/${id}`);
      if (!ml) throw new Error(`Mailing list ${id} disappeared`);
      if (ml.status === "completed") return ml;
      await sleep(2000);
    }
    throw new Error(`Mailing list ${id} did not finish processing`);
  }

  async listJob(id: string, key: "addContacts" | "removeContacts", contactIds: string[]): Promise<void> {
    for (let i = 0; i < contactIds.length; i += 500) {
      await this.waitList(id);
      try {
        await this.request("POST", `/mailing_lists/${id}/jobs`, { [key]: contactIds.slice(i, i + 500) });
      } catch (e) {
        if (e instanceof PostGridError && e.status === 404 && e.message.includes("contacts_not_found")) continue;
        throw e;
      }
      await this.waitList(id);
    }
  }
}

export class PostGridError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------------------------------

export type Recipient = {
  key: string;
  name: string;
  fallback: string | null;
  runs: string[];
  people: string[];
  ticked: string[];
  address: PcoAddress | null;
  country: string;
};

function nameLine(pids: string[], people: Map<string, PcoPerson>, hh?: PcoHousehold): { name: string; fallback: string | null } {
  const primary = hh?.primaryContactId ?? "";
  const adults = pids.filter((p) => !people.get(p)!.child);
  adults.sort((a, b) => {
    if ((a === primary) !== (b === primary)) return a === primary ? -1 : 1;
    return people.get(a)!.firstName.localeCompare(people.get(b)!.firstName);
  });
  const all = adults
    .map((p) => [cleanName(people.get(p)!.firstName), cleanName(people.get(p)!.lastName)] as const)
    .filter(([f, l]) => f || l);
  const seen = new Set<string>();
  const names = all.filter(([f, l]) => {
    const k = `${f.toLowerCase()}|${l.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const fallback = hh?.name ?? "";
  if (!names.length) return { name: fallback, fallback: "no usable names" };
  if (names.length > 3) return { name: fallback, fallback: "more than 3 adults" };
  if (new Set(names.map((n) => n[1].toLowerCase())).size === 1 && names.every((n) => n[0])) {
    return { name: `${names.map((n) => n[0]).join(" & ")} ${names[0][1]}`, fallback: null };
  }
  return { name: names.map(([f, l]) => `${f} ${l}`.trim()).join(" & "), fallback: null };
}

function pickAddress(pids: string[], ticked: Set<string>, people: Map<string, PcoPerson>): PcoAddress | null {
  for (const p of [...pids].sort((a, b) => Number(!ticked.has(a)) - Number(!ticked.has(b)))) {
    const addrs = people.get(p)!.addresses.filter((a) => a.street1 || a.city).sort((a, b) => Number(!a.primary) - Number(!b.primary));
    if (addrs.length) return addrs[0];
  }
  return null;
}

export function buildRecipients(snap: PcoSnapshot, households: Map<string, PcoHousehold>): { recipients: Recipient[]; duplicates: string[] } {
  const people = snap.people;
  const inHh = new Map<string, string>();
  for (const h of households.values()) for (const p of h.people) inHh.set(p, h.id);
  const groups = new Map<string, string[]>();
  for (const p of people.values()) {
    if (p.status !== "active") continue;
    const g = inHh.get(p.id) ?? `p${p.id}`;
    groups.set(g, [...(groups.get(g) ?? []), p.id]);
  }
  const recipients: Recipient[] = [];
  const duplicates: string[] = [];
  for (const [g, pidsAll] of groups) {
    const pids = pidsAll.filter((p) => people.has(p));
    const prefs = new Map(pids.map((p) => [p, (snap.people.get(p)!.fieldData.get(snap.prefsFieldId) ?? []).map((d) => d.value)]));
    const runs = [...new Set(pids.flatMap((p) => prefs.get(p)!.map((v) => RUNS[v]).filter(Boolean)))].sort();
    if (!runs.length) continue;
    const ticked = new Set(pids.filter((p) => prefs.get(p)!.some((v) => RUNS[v])));
    const hh = households.get(g);
    let { name, fallback } = nameLine(pids, people, hh);
    if (!name) {
      const p = people.get(pids[0])!;
      name = `${cleanName(p.firstName)} ${cleanName(p.lastName)}`.trim();
    }
    const address = pickAddress(pids, ticked, people);
    recipients.push({ key: g, name, fallback, runs, people: pids, ticked: [...ticked], address, country: address?.country || "AU" });
    const c = new Map<string, number>();
    for (const p of pids) {
      const k = `${cleanName(people.get(p)!.firstName)} ${cleanName(people.get(p)!.lastName)}`.trim();
      if (k) c.set(k, (c.get(k) ?? 0) + 1);
    }
    for (const [k, n] of c) if (n > 1) duplicates.push(`${name}: ${k} entered ${n} times`);
  }
  return { recipients, duplicates };
}

// ---------------------------------------------------------------------------------------------------
// Payload and hashing. The hash matches the Python tool (sorted keys, ", " / ": " separators, ASCII
// escapes) so state seeded from ssnc.mailchimp-sync does not trigger a rewrite of every contact.
// ---------------------------------------------------------------------------------------------------

export function payloadFor(r: Recipient): Record<string, unknown> {
  const a = r.address!;
  const body: Record<string, unknown> = {
    firstName: r.name,
    addressLine1: a.street1 || "",
    countryCode: r.country,
    metadata: { source: SOURCE, household_key: String(r.key), hub: hubFor(r.country), runs: r.runs.join(",") },
  };
  const optional: Record<string, string> = { addressLine2: a.street2, city: a.city, provinceOrState: a.state, postalOrZip: a.zip };
  for (const [k, v] of Object.entries(optional)) if (v) body[k] = v;
  return body;
}

function pyJson(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") {
    return (
      '"' +
      v.replace(/[\u0000-\u001f"\\\u007f-￿]/g, (c) => {
        const map: Record<string, string> = { '"': '\\"', "\\": "\\\\", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" };
        return map[c] ?? "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
      }) +
      '"'
    );
  }
  if (Array.isArray(v)) return "[" + v.map(pyJson).join(", ") + "]";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => `${pyJson(k)}: ${pyJson(o[k])}`).join(", ") + "}";
  }
  return String(v);
}

export const hashPayload = (p: Record<string, unknown>) => createHash("sha256").update(pyJson(p)).digest("hex");

// ---------------------------------------------------------------------------------------------------
// State (kept in the items table) and the sync itself
// ---------------------------------------------------------------------------------------------------

export type PostGridState = {
  contacts: Record<string, { id: string; hash: string; hub: string; runs: string[] }>;
  lists: Record<string, string>;
  members: Record<string, string[]>;
};
export const POSTGRID_STATE_KEY = { pk: "SYNC#postgrid", sk: "STATE#live" };

export async function loadState(store: ItemsStore): Promise<PostGridState> {
  const row = await store.get(POSTGRID_STATE_KEY);
  const d = (row?.data ?? {}) as Partial<PostGridState>;
  return { contacts: d.contacts ?? {}, lists: d.lists ?? {}, members: d.members ?? {} };
}

async function saveState(store: ItemsStore, state: PostGridState) {
  await store.put({ ...POSTGRID_STATE_KEY, entityType: "sync_state", data: state as unknown as Record<string, unknown> });
}

export async function syncPostGrid(opts: { apply: boolean; pco: Pco; store: ItemsStore; pg?: PostGrid }): Promise<JobResult> {
  const { apply, pco, store } = opts;
  const result = newResult(apply);
  const snap = await loadSnapshot(pco);
  const households = await loadHouseholds(pco);
  const { recipients, duplicates } = buildRecipients(snap, households);
  const sendable = recipients.filter((r) => r.address?.street1);
  const state = await loadState(store);

  const hashes = new Map(sendable.map((r) => [r.key, hashPayload(payloadFor(r))]));
  const changed = sendable.filter((r) => state.contacts[r.key]?.hash !== hashes.get(r.key));
  const stale = Object.keys(state.contacts).filter((k) => !hashes.has(k));
  const wanted: Record<string, number> = {};
  for (const r of sendable) for (const run of r.runs) wanted[`${RUN_NAMES[run]} - ${HUB_NAMES[hubFor(r.country)]}`] = (wanted[`${RUN_NAMES[run]} - ${HUB_NAMES[hubFor(r.country)]}`] ?? 0) + 1;

  const noAddress = recipients.filter((r) => !r.address?.street1);
  for (const r of noAddress) result.attention.push(`No postal address, not mailed: ${r.name} (${r.runs.join(", ")})`);
  for (const r of recipients.filter((x) => x.fallback)) result.attention.push(`Name line fell back to the household name "${r.name}" (${r.fallback})`);
  for (const d of duplicates) result.attention.push(`Same person entered twice: ${d}`);

  result.counts = { recipients: recipients.length, contacts: sendable.length, toWrite: changed.length, toDelete: stale.length, noAddress: noAddress.length };
  result.lines.push(`Recipients ${recipients.length} (${sendable.length} with an address). ${changed.length} contacts to write, ${stale.length} to delete.`);
  for (const [k, n] of Object.entries(wanted).sort()) result.lines.push(`  ${k}: ${n}`);

  if (!apply) {
    result.summary = `Dry run: ${sendable.length} households, ${changed.length} to write, ${stale.length} to delete.`;
    result.status = result.attention.length ? "warning" : "ok";
    return result;
  }

  const pg = opts.pg ?? PostGrid.live();
  const oldIds: string[] = [];
  let written = 0;
  const addressIssues: string[] = [];
  for (const r of changed) {
    await attempt(result, `contact ${r.name}`, async () => {
      const old = state.contacts[r.key]?.id;
      const payload = payloadFor(r);
      let c = (await pg.request("POST", "/contacts", payload))!;
      if (old && c.id === old) {
        // PostGrid returned the existing contact for near-identical data and ignored the change:
        // delete it and create the contact afresh so the new address is verified.
        await pg.request("DELETE", `/contacts/${old}`);
        c = (await pg.request("POST", "/contacts", payload))!;
      } else if (old) {
        oldIds.push(old);
      }
      if (c.addressStatus === "failed") addressIssues.push(`${r.name} (${c.addressErrors ?? "address failed verification"})`);
      state.contacts[r.key] = { id: c.id, hash: hashes.get(r.key)!, hub: hubFor(r.country), runs: r.runs };
      written++;
    });
  }
  for (const k of stale) {
    if (state.contacts[k].id) oldIds.push(state.contacts[k].id);
    delete state.contacts[k];
  }
  await saveState(store, state);
  for (const a of addressIssues) result.attention.push(`PostGrid could not verify the address for ${a}`);

  // Mailing lists: one per run per hub, membership derived from the contacts above.
  const desired = new Map<string, Set<string>>();
  for (const r of sendable) {
    const info = state.contacts[r.key];
    if (!info) continue;
    for (const run of r.runs) desired.set(`${run}|${info.hub}`, (desired.get(`${run}|${info.hub}`) ?? new Set()).add(info.id));
  }
  for (const key of [...new Set([...desired.keys(), ...Object.keys(state.members)])].sort()) {
    const [run, hub] = key.split("|");
    const want = desired.get(key) ?? new Set<string>();
    const prev = new Set(state.members[key] ?? []);
    if (!want.size && !prev.size) continue;
    const label = `${RUN_NAMES[run]} - ${HUB_NAMES[hub]}`;
    await attempt(result, `list ${label}`, async () => {
      let lid = state.lists[key];
      if (!lid || !(await pg.request("GET", `/mailing_lists/${lid}`))) {
        lid = (await pg.request("POST", "/mailing_lists", { description: label, metadata: { source: SOURCE, run, hub } }))!.id;
        state.lists[key] = lid;
        prev.clear();
      }
      await pg.listJob(lid, "addContacts", [...want].filter((x) => !prev.has(x)).sort());
      await pg.listJob(lid, "removeContacts", [...prev].filter((x) => !want.has(x)).sort());
      state.members[key] = [...want].sort();
      const ml = await pg.request("GET", `/mailing_lists/${lid}`);
      const got = Object.values((ml?.recipientCountryCodeCounts ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0);
      if (got !== want.size) result.errors.push(`${label}: PostGrid shows ${got} recipients, expected ${want.size}`);
    });
  }
  await saveState(store, state);
  for (const id of oldIds) await attempt(result, `delete old contact ${id}`, () => pg.request("DELETE", `/contacts/${id}`));

  result.counts.written = written;
  result.status = result.errors.length ? "error" : result.attention.length ? "warning" : "ok";
  result.summary = `PostGrid sync: ${written} contacts written, ${oldIds.length} replaced/deleted, ${sendable.length} households in ${Object.keys(wanted).length} lists. ${result.errors.length} errors, ${result.attention.length} to look at.`;
  return result;
}
