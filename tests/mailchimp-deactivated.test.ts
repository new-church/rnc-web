import { test } from "node:test";
import assert from "node:assert/strict";
import { syncMailchimp } from "../src/lib/sync/mailchimp-sync";
import type { PcoPerson, PcoSnapshot } from "../src/lib/sync/pco";
import type { McMember } from "../src/lib/sync/mailchimp";

const person = (id: string, email: string, status: string, extra: Partial<PcoPerson> = {}): PcoPerson => ({
  id,
  firstName: "A" + id,
  lastName: "Test",
  status,
  membership: "Society Friend",
  child: false,
  emails: [{ id: "e" + id, address: email, primary: true, blocked: false }],
  addresses: [],
  fieldData: new Map(),
  ...extra,
});

const snapshot = (people: PcoPerson[]): PcoSnapshot => ({
  people: new Map(people.map((p) => [p.id, p])),
  fields: {},
  prefsFieldId: "f1",
  unsubFieldId: "f2",
  bouncedFieldId: "f3",
  unsubOnFieldId: "f4",
  membershipTypes: ["Society Friend"],
});

const member = (pcoids: string[], status = "subscribed"): McMember => ({
  status,
  tags: new Set(["type:Society Friend"]),
  fname: "A" + pcoids[0],
  lname: "Test",
  pcoids,
  changed: "2026-01-01T00:00:00+00:00",
});

function fakeMc(members: Map<string, McMember>) {
  const calls: string[] = [];
  const mc = {
    listId: "x",
    members: async () => members,
    tagIds: async () => new Map([["type:Society Friend", 1], ["tag:Society News", 2], ["tag:Swedenborg Centre News", 3], ["tag:Candela", 4]]),
    unsubscribe: async (e: string) => void calls.push(`unsubscribe ${e}`),
    archive: async (e: string) => void calls.push(`archive ${e}`),
    upsert: async (e: string) => (calls.push(`upsert ${e}`), "subscribed"),
    setTags: async (e: string) => void calls.push(`tags ${e}`),
    setPcoid: async (e: string) => void calls.push(`pcoid ${e}`),
  };
  return { mc: mc as never, calls };
}

const fakePco = {} as never;

test("an inactive person who is still subscribed is unsubscribed then archived", async () => {
  const snap = snapshot([person("1", "gone@example.com", "inactive"), person("2", "stay@example.com", "active")]);
  const { mc, calls } = fakeMc(new Map([["gone@example.com", member(["1"])], ["stay@example.com", member(["2"])]]));
  const r = await syncMailchimp({ apply: true, pco: fakePco, mc, snapshot: snap });
  assert.deepEqual(calls.filter((c) => /^(unsubscribe|archive)/.test(c)), ["unsubscribe gone@example.com", "archive gone@example.com"]);
  assert.equal(r.attention.some((a) => a.includes("gone@example.com")), false);
});

test("a dry run reports it and changes nothing", async () => {
  const snap = snapshot([person("1", "gone@example.com", "inactive")]);
  const { mc, calls } = fakeMc(new Map([["gone@example.com", member(["1"])]]));
  const r = await syncMailchimp({ apply: false, pco: fakePco, mc, snapshot: snap });
  assert.equal(calls.length, 0);
  assert.ok(r.lines.some((l) => l.includes("inactive in Planning Center")));
});

test("a shared address with one active person is left alone", async () => {
  const snap = snapshot([person("1", "shared@example.com", "inactive"), person("2", "shared@example.com", "active")]);
  const { mc, calls } = fakeMc(new Map([["shared@example.com", member(["1", "2"])]]));
  await syncMailchimp({ apply: true, pco: fakePco, mc, snapshot: snap });
  assert.equal(calls.some((c) => c.startsWith("archive") || c.startsWith("unsubscribe")), false);
});

test("a reactivated person is not resubscribed by the sync", async () => {
  const snap = snapshot([person("1", "back@example.com", "active")]);
  const { mc, calls } = fakeMc(new Map([["back@example.com", member(["1"], "archived")]]));
  await syncMailchimp({ apply: true, pco: fakePco, mc, snapshot: snap });
  assert.equal(calls.some((c) => c.startsWith("unsubscribe") || c.startsWith("archive")), false);
});
