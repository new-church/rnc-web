import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("About is a drop-down with the church, governance and Swedenborg Centre pages, and those pages exist", () => {
  const header = read("components/Header.astro");
  for (const href of ["/about", "/about/governance", "/about/swedenborg-centre"]) {
    assert.ok(header.includes(`href: '${href}'`), `the About menu must link to ${href}`);
  }
  assert.ok(existsSync(join(root, "pages/about.astro")));
  assert.ok(existsSync(join(root, "pages/about/governance.astro")));
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
  const page = read("pages/about/governance.astro");
  assert.match(page, /\/documents\/sydney-society-constitution\.pdf/);
  assert.match(page, /acnc\.gov\.au\/charity/);
  assert.match(page, /href="\/account\/membership"/);
  assert.ok(existsSync(join(root, "..", "public", "documents", "sydney-society-constitution.pdf")));
});
