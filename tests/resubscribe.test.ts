import { test } from "node:test";
import assert from "node:assert/strict";
import { finishResubscribe, type McLike } from "../src/lib/members/resubscribe";
import { LivePeople } from "../src/lib/members/people";
import type { Pco } from "../src/lib/sync/pco";

const quiet = console.error;
const hush = () => (console.error = () => {});
const speak = () => (console.error = quiet);

function fakeMc(status: string | null | Error) {
  const calls: string[] = [];
  const mc: McLike = {
    status: async () => { calls.push("status"); if (status instanceof Error) throw status; return status; },
    requestResubscribe: async () => void calls.push("requestResubscribe"),
  };
  return { mc, calls };
}
const fakePeople = (fail = false) => {
  const cleared: string[] = [];
  return { cleared, people: { clearUnsubscribedOn: async (id: string) => { if (fail) throw new Error("boom"); cleared.push(id); } } };
};

test("Mailchimp has them unsubscribed: ask for its confirmation email, then clear the date", async () => {
  const { mc, calls } = fakeMc("unsubscribed");
  const { people, cleared } = fakePeople();
  assert.equal(await finishResubscribe({ people, mc }, "7", "a@example.com"), "requested");
  assert.deepEqual(calls, ["status", "requestResubscribe"]);
  assert.deepEqual(cleared, ["7"]);
});

test("already subscribed, pending, cleaned, archived or not in Mailchimp: nothing to ask, the date is cleared", async () => {
  for (const status of ["subscribed", "pending", "cleaned", "archived", null]) {
    const { mc, calls } = fakeMc(status);
    const { people, cleared } = fakePeople();
    assert.equal(await finishResubscribe({ people, mc }, "7", "a@example.com"), "cleared", String(status));
    assert.deepEqual(calls, ["status"], `${status}: must not ask Mailchimp to email them`);
    assert.deepEqual(cleared, ["7"]);
  }
});

test("if Mailchimp can't be reached the date stays, so the nightly sync can finish the job", async () => {
  hush();
  const { mc } = fakeMc(new Error("Mailchimp GET -> 503"));
  const { people, cleared } = fakePeople();
  assert.equal(await finishResubscribe({ people, mc }, "7", "a@example.com"), "deferred");
  assert.deepEqual(cleared, []);
  speak();
});

test("not live (no Mailchimp), or no email on file: nothing happens and the date stays", async () => {
  const { people, cleared } = fakePeople();
  assert.equal(await finishResubscribe({ people, mc: null }, "7", "a@example.com"), "deferred");
  assert.equal(await finishResubscribe({ people, mc: fakeMc("unsubscribed").mc }, "7", ""), "deferred");
  assert.deepEqual(cleared, []);
});

test("if clearing the date fails after Mailchimp was asked, it is still reported as requested", async () => {
  hush();
  const { mc } = fakeMc("unsubscribed");
  assert.equal(await finishResubscribe({ people: fakePeople(true).people, mc }, "7", "a@example.com"), "requested");
  speak();
});

// A stand-in Planning Center holding one person's "Unsubscribed" checkbox and "Unsubscribed on" date.
function fakePco(initial: { flag: boolean; date?: string; prefs?: string[] }) {
  const defs = [{ id: "F1", attributes: { name: "Unsubscribed" } }, { id: "F2", attributes: { name: "Unsubscribed on" } }, { id: "F3", attributes: { name: "Communication preferences" } }];
  let rows: { id: string; field: string; value: string }[] = [];
  let n = 0;
  if (initial.flag) rows.push({ id: `r${++n}`, field: "F1", value: "Unsubscribed" });
  if (initial.date) rows.push({ id: `r${++n}`, field: "F2", value: initial.date });
  for (const p of initial.prefs ?? []) rows.push({ id: `r${++n}`, field: "F3", value: p });
  const pco = {
    all: async (path: string) =>
      path === "/field_definitions" ? defs : rows.map((r) => ({ id: r.id, attributes: { value: r.value }, relationships: { field_definition: { data: { id: r.field } } } })),
    request: async (method: string, path: string, body?: { data: { attributes: { value: string }; relationships: { field_definition: { data: { id: string } } } } }) => {
      if (method === "POST") rows.push({ id: `r${++n}`, field: body!.data.relationships.field_definition.data.id, value: body!.data.attributes.value });
      if (method === "DELETE") rows = rows.filter((r) => r.id !== path.split("/").pop());
      return {};
    },
  };
  const state = () => ({ flag: rows.some((r) => r.field === "F1"), dates: rows.filter((r) => r.field === "F2").map((r) => r.value), prefs: rows.filter((r) => r.field === "F3").map((r) => r.value).sort() });
  return { people: new LivePeople(pco as unknown as Pco), state };
}

test("Planning Center: unsubscribing replaces an old leftover date with today's, so a fresh unsubscribe can't look like a resubscribe", async () => {
  const { people, state } = fakePco({ flag: false, date: "2025-01-01" });
  await people.setUnsubscribed("1", true);
  const s = state();
  assert.equal(s.flag, true);
  assert.equal(s.dates.length, 1, "one date, not two");
  assert.notEqual(s.dates[0], "2025-01-01");
});

test("Planning Center: resubscribing clears the flag and keeps the date until it has been passed to Mailchimp, then it is cleared", async () => {
  const { people, state } = fakePco({ flag: true, date: "2026-11-20" });
  await people.setUnsubscribed("1", false);
  assert.deepEqual({ ...state(), prefs: undefined }, { flag: false, dates: ["2026-11-20"], prefs: undefined });
  await people.clearUnsubscribedOn("1");
  assert.deepEqual({ ...state(), prefs: undefined }, { flag: false, dates: [], prefs: undefined });
  await people.clearUnsubscribedOn("1"); // clearing when there is nothing is fine
});

test("Planning Center: unsubscribing from all email unticks the three email choices and leaves the printed-mail choices alone", async () => {
  const { people, state } = fakePco({ flag: false, prefs: ["Society news", "Candela", "Swedenborg Centre news", "Society news (printed)", "Candela (printed)"] });
  const managed = ["Society news", "Swedenborg Centre news", "Candela"];
  await people.setLists("1", [], managed);
  await people.setUnsubscribed("1", true);
  const s = state();
  assert.equal(s.flag, true);
  assert.deepEqual(s.prefs, ["Candela (printed)", "Society news (printed)"], "only the email choices were cleared");
});
