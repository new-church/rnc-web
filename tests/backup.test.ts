import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBackup, peopleCsv } from "../src/lib/sync/backup";
import { zip } from "../src/lib/zip";
import type { Mail } from "../src/lib/members/mail";

const person = (id: string, first: string, extra: object = {}) => ({
  id,
  type: "Person",
  attributes: { first_name: first, last_name: "Test", status: "active", membership: "Society Friend", medical_notes: "SECRET HEALTH NOTE", ...extra },
});
const rel = (id: string) => ({ person: { data: { id } } });

function fakePco(sizes: { people?: number } = {}) {
  const people = Array.from({ length: sizes.people ?? 2 }, (_, i) => person(String(i + 1), `P${i + 1}`));
  const tables: Record<string, unknown[]> = {
    "/people": people,
    "/emails": [{ id: "e1", attributes: { address: "p1@example.com", primary: true }, relationships: rel("1") }],
    "/phone_numbers": [{ id: "t1", attributes: { number: "0400 000 001", primary: true }, relationships: rel("1") }],
    "/addresses": [{ id: "a1", attributes: { street_line_1: "=1 Formula St", city: "Roseville", primary: true }, relationships: rel("1") }],
    "/notes": [{ id: "n1", attributes: { note: "hello" } }],
  };
  return { all: async (path: string) => JSON.parse(JSON.stringify(tables[path] ?? [])) } as never;
}

const have = (cmd: string) => spawnSync("which", [cmd]).status === 0;

test("backup: emails a valid zip, leaves out medical notes, and names no one in the log", async () => {
  const sent: Mail[] = [];
  const r = await runBackup({ apply: true, pco: fakePco(), to: "joel@example.com", send: async (m) => void sent.push(m), now: new Date("2026-12-01T06:00:00Z") });
  assert.equal(r.status, "ok");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "joel@example.com");
  assert.match(sent[0].subject, /Planning Center backup 2026-12-01/);
  assert.match(r.summary, /j\*\*\*@example\.com/);
  const att = sent[0].attachments![0];
  assert.equal(att.name, "planning-center-backup-2026-12-01.zip");

  if (!have("unzip")) return;
  const dir = mkdtempSync(join(tmpdir(), "bk-"));
  const f = join(dir, "b.zip");
  writeFileSync(f, att.content);
  assert.equal(spawnSync("unzip", ["-tq", f]).status, 0, "unzip accepts the archive");
  const list = spawnSync("unzip", ["-Z1", f]).stdout.toString().split("\n").filter(Boolean);
  for (const n of ["README.txt", "people.csv", "people.json", "notes.json", "field_data.json", "households.json"]) assert.ok(list.includes(n), n);
  const people = spawnSync("unzip", ["-p", f, "people.json"]).stdout.toString();
  assert.ok(!people.includes("SECRET HEALTH NOTE"), "medical notes excluded");
  assert.ok(people.includes('"first_name": "P1"'));
  const csv = spawnSync("unzip", ["-p", f, "people.csv"]).stdout.toString();
  assert.ok(csv.includes("p1@example.com") && csv.includes("0400 000 001"));
});

test("backup: a dry run sends nothing", async () => {
  const sent: Mail[] = [];
  const r = await runBackup({ apply: false, pco: fakePco(), to: "joel@example.com", send: async (m) => void sent.push(m) });
  assert.equal(sent.length, 0);
  assert.match(r.summary, /^Dry run: 2 people/);
});

test("backup: with no recipient configured it fails loudly instead of doing nothing", async () => {
  const prev = process.env.BACKUP_EMAIL_TO;
  delete process.env.BACKUP_EMAIL_TO;
  const r = await runBackup({ apply: true, pco: fakePco(), send: async () => assert.fail("must not send") });
  process.env.BACKUP_EMAIL_TO = prev ?? "";
  if (!prev) delete process.env.BACKUP_EMAIL_TO;
  assert.equal(r.status, "error");
});

test("csv: cells that start with = are neutralised so a spreadsheet won't run them", () => {
  const csv = peopleCsv([person("1", "A") as never], [], [], [{ id: "a", attributes: { street_line_1: "=SUM(A1)", primary: true }, relationships: rel("1") } as never]);
  assert.ok(csv.includes("'=SUM(A1)"));
});

test("zip: round-trips text including non-ASCII names", () => {
  if (!have("unzip")) return;
  const dir = mkdtempSync(join(tmpdir(), "zp-"));
  const f = join(dir, "z.zip");
  writeFileSync(f, zip([{ name: "a.txt", data: "hello ".repeat(500) }, { name: "naïve.txt", data: "é" }]));
  assert.equal(spawnSync("unzip", ["-tq", f]).status, 0);
  assert.equal(spawnSync("unzip", ["-p", f, "a.txt"]).stdout.toString(), "hello ".repeat(500));
});
