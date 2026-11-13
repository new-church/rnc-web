import { requireEnv } from "../env";
import { qs, sleep } from "./util";

const BASE = "https://api.planningcenteronline.com/people/v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type J = any;

/** Planning Center People API client: Basic auth with a Personal Access Token, paced to ~4 requests/second. */
export class Pco {
  private last = 0;
  private auth: string;

  constructor(pat: string, secret: string) {
    this.auth = "Basic " + Buffer.from(`${pat}:${secret}`).toString("base64");
  }

  static fromEnv(): Pco {
    return new Pco(requireEnv("PLANNING_CENTER_PAT"), requireEnv("PLANNING_CENTER_PAT_SECRET"));
  }

  async request(method: string, path: string, body?: unknown, query?: Record<string, string | number>): Promise<J> {
    const url = path.startsWith("http") ? path : BASE + path + qs(query);
    let lastErr = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const wait = 250 - (Date.now() - this.last);
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      const r = await fetch(url, {
        method,
        headers: { Authorization: this.auth, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.status === 429) {
        await sleep(Math.max(1, Number(r.headers.get("retry-after") ?? "5")) * 1000);
        continue;
      }
      if (r.status >= 500) {
        lastErr = `${r.status}`;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!r.ok) {
        throw new Error(`Planning Center ${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      }
      if (r.status === 204) return {};
      return r.json();
    }
    throw new Error(`Planning Center ${method} ${path} kept failing (${lastErr || "rate limited"})`);
  }

  async *paged(path: string, query: Record<string, string | number> = {}): AsyncGenerator<J> {
    let url: string | undefined = BASE + path + qs({ per_page: 100, ...query });
    while (url) {
      const body: J = await this.request("GET", url);
      yield body;
      url = body.links?.next;
    }
  }

  async all(path: string, query: Record<string, string | number> = {}): Promise<J[]> {
    const out: J[] = [];
    for await (const page of this.paged(path, query)) out.push(...(page.data ?? []));
    return out;
  }
}

export type PcoEmail = { id: string; address: string; primary: boolean; blocked: boolean };
export type PcoAddress = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  primary: boolean;
};
export type PcoPerson = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  membership: string | null;
  child: boolean;
  emails: PcoEmail[];
  addresses: PcoAddress[];
  /** custom field definition id -> data rows (checkbox fields hold one row per ticked option) */
  fieldData: Map<string, { id: string; value: string }[]>;
};
export type PcoHousehold = { id: string; name: string; primaryContactId: string; people: string[] };

export type PcoSnapshot = {
  people: Map<string, PcoPerson>;
  /** custom field name -> definition id */
  fields: Record<string, string>;
  prefsFieldId: string;
  unsubFieldId: string;
  bouncedFieldId: string;
  unsubOnFieldId: string | null;
  membershipTypes: string[];
};

export async function loadSnapshot(pco: Pco): Promise<PcoSnapshot> {
  const defs = await pco.all("/field_definitions");
  const fields: Record<string, string> = {};
  for (const f of defs) fields[f.attributes.name] = f.id;
  const prefsFieldId = fields["Communication preferences"] ?? fields["Tags"];
  if (!prefsFieldId) throw new Error('Planning Center field "Communication preferences" not found');
  if (!fields["Unsubscribed"] || !fields["Bounced"]) throw new Error("Planning Center Unsubscribed/Bounced fields not found");

  const people = new Map<string, PcoPerson>();
  for await (const page of pco.paged("/people", { include: "emails,addresses,field_data" })) {
    for (const p of page.data ?? []) {
      people.set(p.id, {
        id: p.id,
        firstName: (p.attributes.first_name ?? "").trim(),
        lastName: (p.attributes.last_name ?? "").trim(),
        status: p.attributes.status ?? "",
        membership: p.attributes.membership || null,
        child: Boolean(p.attributes.child),
        emails: [],
        addresses: [],
        fieldData: new Map(),
      });
    }
    for (const inc of page.included ?? []) {
      const rel = inc.relationships?.person?.data ?? inc.relationships?.customizable?.data;
      const owner = rel ? people.get(rel.id) : undefined;
      if (!owner) continue;
      const a = inc.attributes;
      if (inc.type === "Email") {
        owner.emails.push({ id: inc.id, address: (a.address ?? "").trim(), primary: Boolean(a.primary), blocked: Boolean(a.blocked) });
      } else if (inc.type === "Address") {
        owner.addresses.push({
          street1: a.street_line_1 ?? "",
          street2: a.street_line_2 ?? "",
          city: a.city ?? "",
          state: a.state ?? "",
          zip: a.zip ?? "",
          country: a.country_code ?? "",
          primary: Boolean(a.primary),
        });
      } else if (inc.type === "FieldDatum") {
        const fd = inc.relationships.field_definition.data.id as string;
        const rows = owner.fieldData.get(fd) ?? [];
        rows.push({ id: inc.id, value: a.value == null ? "" : String(a.value) });
        owner.fieldData.set(fd, rows);
      }
    }
  }
  const types = (await pco.request("GET", "/membership_types")).data ?? [];
  return {
    people,
    fields,
    prefsFieldId,
    unsubFieldId: fields["Unsubscribed"],
    bouncedFieldId: fields["Bounced"],
    unsubOnFieldId: fields["Unsubscribed on"] ?? null,
    membershipTypes: types.map((t: J) => t.attributes.value as string),
  };
}

export async function loadHouseholds(pco: Pco): Promise<Map<string, PcoHousehold>> {
  const out = new Map<string, PcoHousehold>();
  for await (const page of pco.paged("/households", { include: "people" })) {
    for (const h of page.data ?? []) {
      out.set(h.id, {
        id: h.id,
        name: h.attributes.name ?? "",
        primaryContactId: String(h.attributes.primary_contact_id ?? ""),
        people: (h.relationships?.people?.data ?? []).map((x: J) => x.id as string),
      });
    }
  }
  return out;
}

export function hasField(p: PcoPerson, fieldId: string | null): boolean {
  return Boolean(fieldId && (p.fieldData.get(fieldId)?.length ?? 0) > 0);
}

export function fieldValues(p: PcoPerson, fieldId: string): string[] {
  return (p.fieldData.get(fieldId) ?? []).map((d) => d.value).filter(Boolean);
}

export function datumRelationships(fieldId: string) {
  return { field_definition: { data: { type: "FieldDefinition", id: fieldId } } };
}
