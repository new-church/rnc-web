import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every endpoint that takes a request must be listed here with the protection it relies on, and the test checks the
 * file really contains it. A new route that isn't listed fails the test, so nothing goes live without a decision.
 *
 *   turnstile      anonymous submissions: a passed Turnstile check is required (verifyTurnstile)
 *   session-csrf   signed-in members: a live session and a matching CSRF token (postContext / csrfOk)
 *   admin          signed-in administrators: the middleware gates /admin and /api/admin (checked below)
 *   cron           Vercel Cron: Bearer CRON_SECRET
 *   address-access the address lookup: a signed cookie earned with a Turnstile check
 *   safe           nothing to protect (read-only public data, or only ends the caller's own session)
 */
type Kind = "turnstile" | "session-csrf" | "admin" | "cron" | "address-access" | "safe";
const routes: Record<string, { kind: Kind; limited?: "inline" | "lib" }> = {
  "api/account/deactivate.ts": { kind: "session-csrf" },
  "api/account/login.ts": { kind: "turnstile", limited: "lib" },
  "api/account/logout.ts": { kind: "session-csrf" },
  "api/account/membership.ts": { kind: "session-csrf" },
  "api/account/prefs.ts": { kind: "session-csrf" },
  "api/account/save.ts": { kind: "session-csrf" },
  "api/account/verify.ts": { kind: "turnstile", limited: "lib" },
  "api/account/who.ts": { kind: "session-csrf" },
  "api/account/whoami.ts": { kind: "safe" }, // returns only this browser's own signed-in state
  "api/address/complete.ts": { kind: "address-access", limited: "inline" },
  "api/address/session.ts": { kind: "turnstile" },
  "api/admin/actions/[id].ts": { kind: "admin" },
  "api/admin/membership/index.ts": { kind: "admin" },
  "api/admin/membership/register.csv.ts": { kind: "admin" },
  "api/auth/login.ts": { kind: "turnstile", limited: "lib" },
  "api/auth/logout.ts": { kind: "safe" }, // POST only (cross-site posts are refused), ends the caller's own sessions
  "api/auth/verify.ts": { kind: "turnstile", limited: "lib" },
  "api/contact.ts": { kind: "turnstile", limited: "inline" },
  "api/cron/[job].ts": { kind: "cron" },
  "api/event-ics/[slug].ts": { kind: "safe" }, // public calendar files
  "api/give.ts": { kind: "turnstile", limited: "inline" },
  "api/subscribe/confirm.ts": { kind: "turnstile", limited: "inline" },
  "api/subscribe/index.ts": { kind: "turnstile", limited: "inline" },
};

const root = join(import.meta.dirname, "..", "src", "pages");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(root).map((f) => relative(root, f));
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("every API route is classified, and every classified route still exists", () => {
  const api = files.filter((f) => f.startsWith("api/") && f.endsWith(".ts"));
  assert.deepEqual(api.filter((f) => !(f in routes)), [], "new API route(s) with no protection decision: add them to the table above");
  assert.deepEqual(Object.keys(routes).filter((f) => !api.includes(f)), [], "table lists routes that no longer exist");
});

test("each route contains the protection it is listed as relying on", () => {
  for (const [file, { kind, limited }] of Object.entries(routes)) {
    const src = read(file);
    if (kind === "turnstile") assert.match(src, /verifyTurnstile\(/, `${file} must verify Turnstile`);
    if (kind === "session-csrf") assert.match(src, /postContext\(|csrfOk\(/, `${file} must need a session and a CSRF token`);
    if (kind === "cron") assert.match(src, /CRON_SECRET/, `${file} must check the cron secret`);
    if (kind === "address-access") assert.match(src, /hasAddressAccess\(/, `${file} must require the address access cookie`);
    if (kind === "admin") assert.ok(file.startsWith("api/admin/"), `${file} is only gated if it lives under api/admin`);
    if (limited === "inline") assert.match(src, /withinLimit\(/, `${file} must rate limit`);
  }
});

test("Turnstile is checked before the work is done in every anonymous submission", () => {
  for (const [file, { kind }] of Object.entries(routes)) {
    if (kind !== "turnstile") continue;
    const src = read(file);
    const t = src.indexOf("verifyTurnstile(");
    for (const work of ["sendMail(", "sendEnquiry(", "createSignup(", "startLogin(", "verifyLogin(", "giveDetails(", "subscribe(", "grantAddressAccess(", "peopleApi()", "createSession("]) {
      const w = src.indexOf(work);
      if (w !== -1) assert.ok(t < w, `${file}: Turnstile must be checked before ${work}`);
    }
  }
});

test("pages that accept a POST are all inside the admin area (so the middleware gates them)", () => {
  const withPost = files.filter((f) => f.endsWith(".astro") && /Astro\.request\.method === ['"]POST['"]/.test(read(f)));
  for (const f of withPost) assert.ok(f.startsWith("admin/"), `${f} accepts a POST outside the gated admin area`);
});

test("the middleware gates /admin and /api/admin, and Astro's cross-site form check is on", () => {
  const mw = readFileSync(join(root, "..", "middleware.ts"), "utf8");
  assert.match(mw, /requireAdminSession/);
  assert.match(mw, /path\.startsWith\("\/api\/admin\/"\)/);
  assert.match(mw, /path === "\/admin" \|\| path\.startsWith\("\/admin\/"\)/);
  const cfg = readFileSync(join(root, "..", "..", "astro.config.mjs"), "utf8");
  assert.match(cfg, /checkOrigin:\s*true/);
});

test("every form page that posts to a Turnstile route renders the widget", () => {
  const formPages = files.filter((f) => f.endsWith(".astro"));
  const needs: [RegExp, string][] = [
    [/action="\/api\/(auth|account)\/(login|verify)"|action=\{apiPath\(\)\}|action=\{apiPath\('\/confirm'\)\}|action="\/api\/contact"/, "a Turnstile route"],
  ];
  for (const f of formPages) {
    const src = read(f);
    for (const [re, label] of needs) {
      if (re.test(src)) assert.ok(/cf-turnstile|TurnstileGuard/.test(src), `${f} posts to ${label} but has no Turnstile widget`);
    }
  }
});

test("no page renders two Turnstile widgets, and the address search keeps its own widget outside the form", () => {
  for (const f of files.filter((x) => x.endsWith(".astro"))) {
    const src = read(f);
    const widgets = (src.match(/class="cf-turnstile"/g) ?? []).length + (src.match(/<TurnstileGuard\b/g) ?? []).length;
    assert.ok(widgets <= 1, `${f} renders ${widgets} Turnstile widgets; a form that posts two tokens fails the server check`);
  }
  const extra = readFileSync(join(root, "..", "components", "ExtraFields.astro"), "utf8");
  assert.ok(!extra.includes("data-address-turnstile"), "the address widget must not be placed inside the form");
  assert.match(extra, /document\.body\.appendChild\(holder\)/, "the address widget must be added to the page body, outside any form");
  assert.match(extra, /script\[src\*="turnstile\/v0\/api\.js"\]/, "the address search must reuse the page's Turnstile script");
});

test("forms that send in the background have a place for the error", () => {
  for (const [file, id] of [["subscribe/index.astro", "subscribe-form"], ["contact.astro", "contact-form"]] as const) {
    const src = read(file);
    assert.ok(src.includes(`id="${id}-error"`) && src.includes(`id="${id}"`), `${file} needs #${id} and #${id}-error`);
    assert.ok(src.includes(`<AjaxForm formId="${id}"`), `${file} must use AjaxForm`);
  }
});
