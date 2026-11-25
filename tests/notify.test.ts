import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { announce, teamsCard } from "../src/lib/notify/index.ts";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("the Teams card names the person and what they did, with a link when the committee must act", () => {
  const card = teamsCard("membership_applied", "Jane Citizen");
  const content = card.attachments[0].content as { body: { text: string }[]; actions?: { url: string }[] };
  assert.match(content.body[1].text, /Jane Citizen has asked to become a member/);
  assert.equal(content.actions?.[0].url, "https://www.rosevillenewchurch.com.au/admin/membership");
  assert.equal(teamsCard("details_updated", "Jane Citizen", "phone").attachments[0].content.actions, undefined);
});

test("a sign-in is one quiet line, with no heading or button", () => {
  const content = teamsCard("signed_in", "Jane Citizen", "administrator").attachments[0].content as { body: { text: string; isSubtle?: boolean }[]; actions?: unknown };
  assert.equal(content.body.length, 1);
  assert.equal(content.body[0].text, "Jane Citizen signed in (administrator).");
  assert.equal(content.body[0].isSubtle, true);
  assert.equal(content.actions, undefined);
});

test("both sign-in endpoints announce a successful sign-in", () => {
  for (const f of ["pages/api/auth/verify.ts", "pages/api/account/verify.ts"]) assert.match(read(f), /announce\(["']signed_in["']/);
});

test("announce does nothing, and does not fail, when nothing is configured", async () => {
  delete process.env.TEAMS_ALERT_WEBHOOK;
  delete process.env.GA4_API_SECRET;
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("ok"); }) as typeof fetch;
  try {
    await announce("membership_applied", "Jane Citizen");
    assert.equal(calls, 0);
  } finally { globalThis.fetch = real; }
});

test("announce posts to Teams, survives a failing webhook, and sends no email address", async () => {
  process.env.TEAMS_ALERT_WEBHOOK = "https://example.invalid/hook";
  process.env.VERCEL_ENV = "production";
  const real = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (_u: unknown, init?: RequestInit) => { sent.push(String(init?.body)); return new Response("no", { status: 500 }); }) as typeof fetch;
  try {
    await announce("resignation_requested", "Jane Citizen", "and deactivating their account");
    assert.equal(sent.length, 1);
    assert.match(sent[0], /Jane Citizen/);
    assert.doesNotMatch(sent[0], /@/);
  } finally { globalThis.fetch = real; delete process.env.TEAMS_ALERT_WEBHOOK; delete process.env.VERCEL_ENV; }
});

test("Teams is not posted to from preview or local, even when the webhook is set", async () => {
  process.env.TEAMS_ALERT_WEBHOOK = "https://example.invalid/hook";
  process.env.VERCEL_ENV = "preview";
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("ok"); }) as typeof fetch;
  try {
    await announce("membership_applied", "Jane Citizen");
    assert.equal(calls, 0);
  } finally { globalThis.fetch = real; delete process.env.TEAMS_ALERT_WEBHOOK; delete process.env.VERCEL_ENV; }
});

test("analytics events are only sent from production and carry no name", async () => {
  process.env.GA4_API_SECRET = "secret";
  process.env.VERCEL_ENV = "preview";
  const real = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (u: unknown, init?: RequestInit) => { sent.push(String(u) + String(init?.body)); return new Response("", { status: 204 }); }) as typeof fetch;
  try {
    await announce("details_updated", "Jane Citizen");
    assert.equal(sent.length, 0);
    process.env.VERCEL_ENV = "production";
    await announce("details_updated", "Jane Citizen");
    assert.equal(sent.length, 1);
    assert.match(sent[0], /rnc_details_updated/);
    assert.doesNotMatch(sent[0], /Jane/);
  } finally { globalThis.fetch = real; delete process.env.GA4_API_SECRET; delete process.env.VERCEL_ENV; }
});

test("every place that writes an audit row for a member action also announces it", () => {
  const pairs: [string, string][] = [
    ["lib/members/membership.ts", "membership_apply"],
    ["pages/api/account/save.ts", "details_updated"],
    ["pages/api/account/prefs.ts", "preferences_updated"],
    ["pages/api/subscribe/confirm.ts", "signup_confirmed"],
  ];
  for (const [file] of pairs) assert.match(read(file), /announce\(/, `${file} should call announce`);
  assert.equal((read("lib/members/membership.ts").match(/await announce\(/g) ?? []).length, 7);
});
