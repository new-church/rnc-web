import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const src = new URL("../src", import.meta.url).pathname;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(src).filter((f) => f.endsWith(".astro"));

test("dropdowns: no page writes a bare <select>, they all use <Select> so the arrow is right", () => {
  const bare = files.filter((f) => !f.endsWith("components/Select.astro")).filter((f) => /<select[\s>]/.test(readFileSync(f, "utf8")));
  assert.deepEqual(bare, [], "use <Select> from src/components/Select.astro instead of <select>");
});

test("dropdowns: the shared Select adds the chevron class, and the chevron is styled once, site-wide", () => {
  const select = readFileSync(join(src, "components/Select.astro"), "utf8");
  assert.match(select, /'select-field'/);
  const css = readFileSync(join(src, "styles/global.css"), "utf8");
  const rule = /\.select-field \{([^}]*)\}/.exec(css)?.[1] ?? "";
  assert.match(rule, /appearance:\s*none/, "the browser's own arrow must be switched off");
  assert.match(rule, /padding-right:/, "room for the arrow so text never runs under it");
  assert.match(rule, /background-position:\s*right [\d.]+rem/, "the arrow is inset from the right edge");
  // A scoped copy inside a component would only style that component's dropdowns.
  const scoped = files.filter((f) => /<style[^>]*>[^<]*\.select-field/.test(readFileSync(f, "utf8")));
  assert.deepEqual(scoped, []);
});

test("links in running text are underlined, and buttons opt out", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "src", "styles", "global.css"), "utf8");
  assert.match(css, /:where\(p, li, dd, td, th, figcaption, blockquote, small\) a \{[^}]*text-decoration-line: underline/);
  const button = readFileSync(join(import.meta.dirname, "..", "src", "components", "Button.astro"), "utf8");
  assert.match(button, /no-underline/);
});

test("a lead paragraph that runs straight into body text gets a short divider", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "src", "styles", "global.css"), "utf8");
  assert.match(css, /\.prose-rnc :where\(h1 \+ p \+ p\)::before \{/);
});
