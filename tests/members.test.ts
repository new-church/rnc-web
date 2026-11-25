import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryKv } from "../src/lib/members/memory-kv";
import { createSignup, readSignup, parseSignupForm } from "../src/lib/members/signup";
import { startLogin, verifyLogin } from "../src/lib/members/auth";
import { createSession, readSession, setSessionPerson } from "../src/lib/members/session";
import { withinLimit } from "../src/lib/members/rate";
import { DemoPeople, resetDemoPeople } from "../src/lib/members/people";
import { applyForMembership, decideRequest, openRequests, requestResignation, requestsFor, withdrawRequest } from "../src/lib/members/membership";
import { parseBirthdate, parseExtra } from "../src/lib/members/validate";
import { memberConfig } from "../src/lib/members/config";

const quiet = console.log;
let logged: string[] = [];
beforeEach(() => {
  resetDemoPeople();
  logged = [];
  console.log = (...a: unknown[]) => void logged.push(a.join(" "));
});
const codeFromLog = () => /Your code is (\d{6})/.exec(logged.join("\n"))?.[1];

test("signup: the link reference works, a wrong secret does not, and 5 wrong secrets delete it", async () => {
  const kv = memoryKv();
  const data = { email: "a@example.com", first: "A", last: "B", lists: ["society"], extra: {} };
  const ref = await createSignup(kv, data);
  assert.deepEqual(await readSignup(kv, ref), data);
  const id = ref.split(".")[0];
  for (let i = 0; i < 5; i++) assert.equal(await readSignup(kv, `${id}.wrong${i}`), null);
  assert.equal(await readSignup(kv, ref), null, "locked out after 5 wrong tries");
});

test("signup: an expired row is gone", async () => {
  const clock = { now: Date.now() };
  const kv = memoryKv(clock);
  const ref = await createSignup(kv, { email: "a@example.com", first: "A", last: "B", lists: ["society"], extra: {} }, clock.now);
  clock.now += (memberConfig.ttl.signup + 1) * 1000;
  assert.equal(await readSignup(kv, ref), null);
});

test("signup form: extra details are optional, validated, and an address must be complete", () => {
  const f = (o: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ email: "a@example.com", first: "A", last: "B", ...o })) fd.set(k, v);
    fd.append("lists", "society");
    return parseSignupForm(fd);
  };
  assert.equal(f({}).ok, true);
  assert.equal(f({ birthdate: "2999-01-01" }).ok, false);
  assert.equal(f({ birthdate: "1950-02-30" }).ok, false);
  assert.equal(f({ street1: "1 Test St" }).ok, false, "incomplete address");
  const ok = f({ street1: "1 Test St", city: "Roseville", zip: "2069", birthdate: "1950-02-03", phone: "0412 345 678" });
  assert.equal(ok.ok, true);
  assert.equal(parseBirthdate("1950-02-03"), "1950-02-03");
  assert.equal(parseExtra(new FormData()).ok, true);
});

test("login: code works once, wrong codes are limited, unknown addresses look the same", async () => {
  const kv = memoryKv();
  const people = new DemoPeople();
  const deps = { kv, people };
  assert.deepEqual(await startLogin(deps, "test@example.com", "1.2.3.4"), { ok: true });
  const code = codeFromLog()!;
  assert.ok(code);
  const bad = await verifyLogin(deps, "test@example.com", code === "000000" ? "111111" : "000000", "1.2.3.4");
  assert.equal(bad.ok, false);
  const good = await verifyLogin(deps, "test@example.com", code, "1.2.3.4");
  assert.equal(good.ok, true);
  assert.equal((await verifyLogin(deps, "test@example.com", code, "1.2.3.4")).ok, false, "single use");

  logged = [];
  assert.deepEqual(await startLogin(deps, "nobody@example.com", "1.2.3.4"), { ok: true });
  assert.equal(codeFromLog(), undefined, "no email for an unknown address");
  assert.equal((await startLogin(deps, "not an email", "1.2.3.4")).ok, false);
});

test("login: five wrong codes burn the challenge", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople() };
  await startLogin(deps, "test@example.com", "9.9.9.9");
  const code = codeFromLog()!;
  const wrong = code === "123456" ? "654321" : "123456";
  for (let i = 0; i < 5; i++) assert.equal((await verifyLogin(deps, "test@example.com", wrong, "9.9.9.9")).ok, false);
  assert.equal((await verifyLogin(deps, "test@example.com", code, "9.9.9.9")).ok, false);
});

test("login: a deactivated person gets no code", async () => {
  const kv = memoryKv();
  const people = new DemoPeople();
  await people.deactivate("1");
  await startLogin({ kv, people }, "test@example.com", "1.1.1.1");
  assert.equal(codeFromLog(), undefined);
});

test("login: a shared address asks which person, and only a listed person can be chosen", async () => {
  const kv = memoryKv();
  const people = new DemoPeople();
  await people.subscribe({ email: "test@example.com", first: "Other", last: "Person", lists: ["society"], extra: {} }); // joins existing: same person
  const token = await createSession(kv, { email: "test@example.com", personId: null, candidates: [{ id: "1", label: "Test P." }, { id: "2", label: "Sam P." }] });
  await assert.rejects(() => setSessionPerson(kv, token, "999"));
  await setSessionPerson(kv, token, "2");
  assert.equal((await readSession(kv, token))?.personId, "2");
});

test("session: idle expiry slides and the absolute limit holds", async () => {
  const clock = { now: Date.now() };
  const kv = memoryKv(clock);
  const token = await createSession(kv, { email: "a@example.com", personId: "1" }, clock.now);
  clock.now += 20 * 60_000;
  assert.ok(await readSession(kv, token, clock.now), "still valid within 30 minutes");
  clock.now += 20 * 60_000;
  assert.ok(await readSession(kv, token, clock.now), "sliding: 40 minutes after start but 20 since last use");
  clock.now += 31 * 60_000;
  assert.equal(await readSession(kv, token, clock.now), null, "idle for over 30 minutes");
  assert.equal(await readSession(kv, "short"), null);
});

test("rate limit: counts within a window then refuses", async () => {
  const kv = memoryKv();
  const rule = { limit: 3, windowSeconds: 60 };
  const r = [];
  for (let i = 0; i < 5; i++) r.push(await withinLimit(kv, "t", "x", rule, 1_000_000));
  assert.deepEqual(r, [true, true, true, false, false]);
});

const who = { personId: "1", email: "test@example.com" };
const consent = { avowed: [true, true, true, true], guarantee: true, register: true };

test("membership: every box must be ticked", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  const r = await applyForMembership(deps, who, { ...consent, avowed: [true, true, true, false] });
  assert.equal(r.ok, false);
});

test("membership: apply, approve with proposer and seconder, and the person becomes a member", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  assert.equal((await applyForMembership(deps, who, consent)).ok, true);
  assert.equal((await applyForMembership(deps, who, consent)).ok, false, "no second pending application");
  const open = await openRequests(deps.kv);
  assert.equal(open.length, 1);

  const base = { personId: "1", sk: open[0].sk, decidedBy: "sec@example.com", resolutionDate: "2026-11-20", minuteRef: "4.2" };
  assert.equal((await decideRequest(deps, { ...base, decision: "approve" })).ok, false, "needs proposer and seconder");
  assert.equal((await decideRequest(deps, { ...base, decision: "approve", proposedBy: "A", secondedBy: "a" })).ok, false, "different people");
  assert.equal((await decideRequest(deps, { ...base, decision: "approve", proposedBy: "A Member", secondedBy: "B Member" })).ok, true);

  assert.equal((await deps.people.get("1"))?.membership, memberConfig.membership.member);
  assert.equal((await openRequests(deps.kv)).length, 0, "no longer in the queue");
  assert.equal((await decideRequest(deps, { ...base, decision: "approve", proposedBy: "A Member", secondedBy: "B Member" })).ok, false, "decided once");
  assert.ok(logged.some((l) => l.includes("Admitted as a member") && l.includes("Proposed by A Member")));
});

test("membership: a declined application leaves them a friend", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  await applyForMembership(deps, who, consent);
  const [req] = await openRequests(deps.kv);
  await decideRequest(deps, { personId: "1", sk: req.sk, decision: "decline", decidedBy: "s", resolutionDate: "2026-11-20", minuteRef: "5" });
  assert.equal((await deps.people.get("1"))?.membership, memberConfig.membership.society);
  assert.equal((await requestsFor(deps.kv, "1"))[0].data.status, "declined");
});

test("membership: a person can withdraw an application", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  await applyForMembership(deps, who, consent);
  const [req] = await openRequests(deps.kv);
  assert.equal((await withdrawRequest(deps, "1", req.sk)).ok, true);
  assert.equal((await openRequests(deps.kv)).length, 0);
  assert.equal((await withdrawRequest(deps, "1", req.sk)).ok, false);
});

test("resignation: only members, becomes a friend once the Committee records it", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  assert.equal((await requestResignation(deps, who, false)).ok, false, "a friend can't resign");
  await deps.people.setMembership("1", memberConfig.membership.member);
  assert.equal((await requestResignation(deps, who, false)).ok, true);
  assert.equal((await deps.people.get("1"))?.membership, memberConfig.membership.member, "still a member until the Committee decides");
  const [req] = await openRequests(deps.kv);
  assert.equal((await decideRequest(deps, { personId: "1", sk: req.sk, decision: "decline", decidedBy: "s", resolutionDate: "2026-11-20", minuteRef: "6" })).ok, false);
  assert.equal((await decideRequest(deps, { personId: "1", sk: req.sk, decision: "approve", decidedBy: "s", resolutionDate: "2026-11-20", minuteRef: "6" })).ok, true);
  assert.equal((await deps.people.get("1"))?.membership, memberConfig.membership.society);
});

test("resignation with deactivation: the account closes now, the member until the Committee decides", async () => {
  const deps = { kv: memoryKv(), people: new DemoPeople() };
  await deps.people.setMembership("1", memberConfig.membership.member);
  assert.equal((await requestResignation(deps, who, true)).ok, true);
  const p = await deps.people.get("1");
  assert.equal(p?.status, "inactive");
  assert.equal(p?.unsubscribed, true);
  assert.equal(p?.membership, memberConfig.membership.member);
  const [req] = await openRequests(deps.kv);
  assert.equal((await decideRequest(deps, { personId: "1", sk: req.sk, decision: "approve", decidedBy: "s", resolutionDate: "2026-11-20", minuteRef: "7" })).ok, true);
  assert.equal((await deps.people.get("1"))?.membership, memberConfig.membership.society);
});

test("signup in people: an inactive person is not quietly reactivated, and blanks are filled but never overwritten", async () => {
  const people = new DemoPeople();
  await people.updateDetails("1", { phone: "0400 000 000" });
  const r = await people.subscribe({ email: "test@example.com", first: "Test", last: "Person", lists: ["society", "candela"], extra: { phone: "9999 9999", birthdate: "1950-01-01" } });
  assert.equal(r.created, false);
  const p = await people.get("1");
  assert.equal(p?.phone, "0400 000 000", "existing phone kept");
  assert.equal(p?.birthdate, "1950-01-01", "blank birthday filled");
  assert.ok(p?.lists.includes("Candela"));
  await people.deactivate("1");
  assert.equal((await people.subscribe({ email: "test@example.com", first: "Test", last: "Person", lists: ["society"], extra: {} })).inactive, true);
  assert.equal((await people.get("1"))?.status, "inactive");
});

test.after(() => {
  console.log = quiet;
});
