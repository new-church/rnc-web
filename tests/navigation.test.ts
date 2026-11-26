import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("About is a drop-down with the church, governance and Swedenborg Centre pages, and those pages exist", () => {
  const header = read("components/Header.astro");
  for (const href of ["/about", "/about/membership", "/about/swedenborg-centre"]) {
    assert.ok(header.includes(`href: '${href}'`), `the About menu must link to ${href}`);
  }
  assert.ok(existsSync(join(root, "pages/about.astro")));
  assert.ok(existsSync(join(root, "pages/about/membership.astro")));
  assert.ok(existsSync(join(root, "pages/about/swedenborg-centre.astro")));
  assert.match(header, /id="about-toggle"/);
});

test("the top menu no longer sends visitors straight to the external Swedenborg Centre site, and has a Log in button", () => {
  const header = read("components/Header.astro");
  assert.ok(!header.includes("swedenborg.com.au"), "the header must not link out to swedenborg.com.au");
  assert.match(header, /href="\/login"/);
  assert.match(header, /id="login-link"/);
  assert.match(header, /id="login-link-mobile"/);
});

test("the Swedenborg Centre page is where the external link lives", () => {
  assert.match(read("pages/about/swedenborg-centre.astro"), /href="https:\/\/swedenborg\.com\.au\/"/);
});

test("the governance page links to the constitution, the ACNC register and the membership application", () => {
  const page = read("pages/about/membership.astro");
  assert.match(page, /\/documents\/sydney-society-constitution\.pdf/);
  assert.match(page, /acnc\.gov\.au\/charity/);
  assert.match(page, /href="\/account\/membership"/);
  assert.ok(existsSync(join(root, "..", "public", "documents", "sydney-society-constitution.pdf")));
});

test("preview deployments say they are previews (so a shared branch isn't mistaken for the live site)", () => {
  const layout = read("layouts/BaseLayout.astro");
  assert.match(layout, /VERCEL_ENV === 'preview'/);
  assert.match(layout, /Preview for review/);
});

test("About, Membership and governance and the Swedenborg Centre link to one another without the menu", () => {
  const about = read("pages/about.astro");
  const membership = read("pages/about/membership.astro");
  const centre = read("pages/about/swedenborg-centre.astro");
  assert.match(about, /href="\/about\/membership"/);
  assert.match(about, /href="\/about\/membership#check-membership"/);
  assert.match(about, /href="\/about\/swedenborg-centre"/);
  assert.match(membership, /href="\/about"/);
  assert.match(membership, /href="\/about\/swedenborg-centre"/);
  assert.match(centre, /href="\/about"/);
  assert.match(centre, /href="\/about\/membership"/);
  // the links with a #anchor need the anchors to exist
  assert.match(membership, /id="check-membership"/);
  assert.match(membership, /id="what-the-society-is-for"/);
  assert.match(about, /membership#what-the-society-is-for/);
});

test("there is one sign-in page: /account sends people to /login, which explains how to sign up", () => {
  const login = read("pages/login/index.astro");
  assert.match(login, /New here\? Create your account/);
  assert.match(login, /href="\/subscribe"/);
  const account = read("pages/account/index.astro");
  assert.match(account, /Astro\.redirect\(`\/login/);
  assert.ok(!existsSync(join(root, "pages/account/code.astro")), "the duplicate code page is gone");
  assert.ok(!existsSync(join(root, "pages/api/account/login.ts")) && !existsSync(join(root, "pages/api/account/verify.ts")), "the duplicate sign-in endpoints are gone");
  const subscribe = read("pages/subscribe/index.astro");
  assert.match(subscribe, /Already on our list\?/);
  assert.match(subscribe, /href="\/login"/);
});

test("the header's main button is Sign up, Log in is the second button, and Contact us lives in the About menu", () => {
  const header = read("components/Header.astro");
  assert.match(header, /variant="gold"[^>]*href="\/subscribe"[^>]*id="signup-link"/s);
  assert.match(header, /href: '\/contact', label: 'Contact us'/);
  assert.ok(!/variant="gold"[^>]*href="\/contact"/s.test(header), "no gold Contact button any more");
  for (const id of ["signup-link", "signup-link-compact", "signup-link-mobile", "login-link", "login-link-mobile"]) assert.match(header, new RegExp(`'${id}'`), `${id} hides once signed in`);
});
