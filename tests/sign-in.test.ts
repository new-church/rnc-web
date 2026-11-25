import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryKv } from "../src/lib/members/memory-kv";
import { startLogin, verifyLogin, type VerifyResult } from "../src/lib/members/auth";
import { createAdminSession, readAdminSession } from "../src/lib/auth/admin-session";
import { readSession } from "../src/lib/members/session";
import { DemoPeople, resetDemoPeople } from "../src/lib/members/people";
import { memberConfig } from "../src/lib/members/config";
import type { AppUser } from "../src/lib/auth/users";

// The demo Planning Center person is test@example.com. These addresses are administrators.
const admins = new Set(["admin@example.com", "test@example.com"]);
const isAdmin = async (e: string) => admins.has(e);

const quiet = console.log;
let logged: string[] = [];
beforeEach(() => {
  resetDemoPeople();
  admins.clear();
  admins.add("admin@example.com");
  admins.add("test@example.com");
  logged = [];
  console.log = (...a: unknown[]) => void logged.push(a.join(" "));
});
const code = () => /Your code is (\d{6})/.exec(logged.join("\n"))?.[1];
const ok = (r: VerifyResult) => {
  assert.ok(r.ok);
  return r as Extract<VerifyResult, { ok: true }>;
};

test("an administrator who is not in Planning Center gets a code and an admin session only", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople(), isAdmin };
  assert.deepEqual(await startLogin(deps, "Admin@Example.com", "1.1.1.1"), { ok: true });
  const r = ok(await verifyLogin(deps, "admin@example.com", code()!, "1.1.1.1"));
  assert.equal(r.member, null);
  assert.equal((await readAdminSession(kv, r.admin!.token))?.email, "admin@example.com");
});

test("one code opens both the member and the admin session for someone who is both", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople(), isAdmin };
  await startLogin(deps, "test@example.com", "2.2.2.2");
  const r = ok(await verifyLogin(deps, "test@example.com", code()!, "2.2.2.2"));
  assert.equal((await readSession(kv, r.member!.token))?.personId, "1");
  assert.equal((await readAdminSession(kv, r.admin!.token))?.email, "test@example.com");
});

test("a member who is not an admin gets a member session and no admin session", async () => {
  const kv = memoryKv();
  admins.delete("test@example.com");
  const deps = { kv, people: new DemoPeople(), isAdmin };
  await startLogin(deps, "test@example.com", "3.3.3.3");
  const r = ok(await verifyLogin(deps, "test@example.com", code()!, "3.3.3.3"));
  assert.ok(r.member);
  assert.equal(r.admin, null);
});

test("an address that is neither a member nor an admin gets no code, the same answer, and no stored rows", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople(), isAdmin };
  assert.deepEqual(await startLogin(deps, "stranger@example.com", "4.4.4.4"), { ok: true });
  assert.equal(code(), undefined);
  assert.deepEqual([...kv.rows.keys()].filter((k) => !k.startsWith("RATE#")), [], "nothing is created for an unknown address");
  assert.equal((await startLogin(deps, "not an email", "4.4.4.4")).ok, false);
});

test("an admin whose access is removed between the code and the sign-in gets no admin session", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople(), isAdmin };
  await startLogin(deps, "admin@example.com", "5.5.5.5");
  const c = code()!;
  admins.delete("admin@example.com");
  assert.equal((await verifyLogin(deps, "admin@example.com", c, "5.5.5.5")).ok, false, "not a member either, so nothing to open");
});

test("the code works once and five wrong tries burn it", async () => {
  const kv = memoryKv();
  const deps = { kv, people: new DemoPeople(), isAdmin };
  await startLogin(deps, "admin@example.com", "6.6.6.6");
  const c = code()!;
  const wrong = c === "123456" ? "654321" : "123456";
  for (let i = 0; i < 5; i++) assert.equal((await verifyLogin(deps, "admin@example.com", wrong, "6.6.6.6")).ok, false);
  assert.equal((await verifyLogin(deps, "admin@example.com", c, "6.6.6.6")).ok, false, "burned");
  logged = [];
  await startLogin({ ...deps, now: () => Date.now() + 120_000 }, "admin@example.com", "6.6.6.8");
  const c2 = code()!;
  assert.ok((await verifyLogin(deps, "admin@example.com", c2, "6.6.6.8")).ok);
  assert.equal((await verifyLogin(deps, "admin@example.com", c2, "6.6.6.8")).ok, false, "single use");
});

test("admin session: idle expiry slides, the absolute limit holds, and short tokens are rejected", async () => {
  const clock = { now: Date.now() };
  const kv = memoryKv(clock);
  const token = await createAdminSession(kv, "admin@example.com", clock.now);
  clock.now += 20 * 60_000;
  assert.ok(await readAdminSession(kv, token, clock.now));
  clock.now += 20 * 60_000;
  assert.ok(await readAdminSession(kv, token, clock.now), "40 minutes after the start but only 20 since last use");
  clock.now += 31 * 60_000;
  assert.equal(await readAdminSession(kv, token, clock.now), null, "idle over 30 minutes");
  assert.equal(await readAdminSession(kv, "short"), null);
  assert.equal(await readAdminSession(kv, undefined), null);
  const t2 = await createAdminSession(kv, "admin@example.com", clock.now);
  assert.equal(await readAdminSession(kv, t2, clock.now + memberConfig.ttl.sessionAbsolute * 1000), null, "8 hour limit");
});

test("removing someone's admin access ends their admin session on the next request", async () => {
  const { getSessionContext } = await import("../src/lib/auth/session");
  const { memberKv } = await import("../src/lib/members/kv");
  const user = (scopes: string[]): AppUser => ({ row: {} as never, data: { email: "admin@example.com", scopes } });
  const token = await createAdminSession(memberKv(), "admin@example.com");
  const jar = { get: (n: string) => (n === "rnc_admin" ? { value: token } : undefined) } as never;
  assert.equal((await getSessionContext({ cookies: jar }, { findUser: async () => user(["admin"]) }))?.email, "admin@example.com");
  assert.equal(await getSessionContext({ cookies: jar }, { findUser: async () => user([]) }), null, "scopes removed");
  assert.equal(await getSessionContext({ cookies: jar }, { findUser: async () => null }), null, "user deleted");
});

test.after(() => {
  console.log = quiet;
});
