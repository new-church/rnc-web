import { createHash } from "node:crypto";
import { requireEnv } from "../env";
import type { J } from "./pco";
import { qs, sleep, splitIds } from "./util";

export type McMember = {
  status: string;
  tags: Set<string>;
  fname: string;
  lname: string;
  pcoids: string[];
  changed: string;
};

export class Mailchimp {
  private base: string;
  private auth: string;
  readonly listId: string;

  constructor(apiKey: string, listId: string) {
    const dc = apiKey.split("-").pop();
    this.base = `https://${dc}.api.mailchimp.com/3.0`;
    this.auth = "Basic " + Buffer.from(`x:${apiKey}`).toString("base64");
    this.listId = listId;
  }

  static fromEnv(): Mailchimp {
    return new Mailchimp(requireEnv("MAILCHIMP_API_KEY"), requireEnv("MAILCHIMP_AUDIENCE_ID"));
  }

  async request(method: string, path: string, body?: unknown, query?: Record<string, string | number>): Promise<J> {
    let lastErr = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(this.base + path + qs(query), {
        method,
        headers: { Authorization: this.auth, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.status === 429 || r.status >= 500) {
        lastErr = String(r.status);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!r.ok) throw new Error(`Mailchimp ${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      if (r.status === 204) return {};
      return r.json();
    }
    throw new Error(`Mailchimp ${method} ${path} kept failing (${lastErr})`);
  }

  private member(email: string): string {
    const hash = createHash("md5").update(email.toLowerCase()).digest("hex");
    return `/lists/${this.listId}/members/${hash}`;
  }

  async members(): Promise<Map<string, McMember>> {
    const out = new Map<string, McMember>();
    for (let offset = 0; ; offset += 1000) {
      const r = await this.request("GET", `/lists/${this.listId}/members`, undefined, {
        count: 1000,
        offset,
        fields:
          "total_items,members.email_address,members.status,members.tags,members.merge_fields.FNAME,members.merge_fields.LNAME,members.merge_fields.PCOID,members.last_changed",
      });
      for (const m of r.members as J[]) {
        out.set(String(m.email_address).toLowerCase(), {
          status: m.status,
          tags: new Set((m.tags ?? []).map((t: J) => t.name as string)),
          fname: String(m.merge_fields?.FNAME ?? "").trim(),
          lname: String(m.merge_fields?.LNAME ?? "").trim(),
          pcoids: splitIds(m.merge_fields?.PCOID),
          changed: m.last_changed ?? "",
        });
      }
      if (offset + 1000 >= r.total_items) return out;
    }
  }

  async tagIds(): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (let offset = 0; ; offset += 1000) {
      const r = await this.request("GET", `/lists/${this.listId}/segments`, undefined, {
        type: "static",
        count: 1000,
        offset,
        fields: "total_items,segments.name,segments.id",
      });
      for (const s of r.segments as J[]) out.set(s.name, s.id);
      if (offset + 1000 >= r.total_items) return out;
    }
  }

  renameTag(segmentId: number, name: string) {
    return this.request("PATCH", `/lists/${this.listId}/segments/${segmentId}`, { name });
  }

  createTag(name: string) {
    return this.request("POST", `/lists/${this.listId}/segments`, { name, static_segment: [] });
  }

  /** Add or update a contact. Returns Mailchimp's resulting status ("archived" means it was NOT re-added). */
  async upsert(email: string, fname: string, lname: string, pcoids: string[]): Promise<string> {
    const r = await this.request("PUT", this.member(email), {
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: { FNAME: fname, LNAME: lname, PCOID: pcoids.join(",") },
    });
    return r.status as string;
  }

  changeEmail(oldEmail: string, newEmail: string, fname: string, lname: string, pcoids: string[]) {
    return this.request("PATCH", this.member(oldEmail), {
      email_address: newEmail,
      merge_fields: { FNAME: fname, LNAME: lname, PCOID: pcoids.join(",") },
    });
  }

  setPcoid(email: string, pcoids: string[]) {
    return this.request("PATCH", this.member(email), { merge_fields: { PCOID: pcoids.join(",") } });
  }

  setTags(email: string, add: Iterable<string>, remove: Iterable<string>) {
    const tags = [
      ...[...add].sort().map((name) => ({ name, status: "active" })),
      ...[...remove].sort().map((name) => ({ name, status: "inactive" })),
    ];
    return this.request("POST", `${this.member(email)}/tags`, { tags });
  }

  /** Archive (Mailchimp's reversible delete). Never the permanent delete. */
  archive(email: string) {
    return this.request("DELETE", this.member(email));
  }

  /** The contact's status in the audience (subscribed, unsubscribed, pending, cleaned, archived), or null if absent. */
  async status(email: string): Promise<string | null> {
    try {
      const r = await this.request("GET", this.member(email), undefined, { fields: "status" });
      return (r.status as string) ?? null;
    } catch (e) {
      if (String(e instanceof Error ? e.message : e).includes("-> 404")) return null;
      throw e;
    }
  }

  /** Ask an unsubscribed contact to opt back in: status pending sends Mailchimp's confirmation email. */
  requestResubscribe(email: string) {
    return this.request("PATCH", this.member(email), { status: "pending" });
  }

  unsubscribe(email: string) {
    return this.request("PATCH", this.member(email), { status: "unsubscribed" });
  }
}
