# Roseville New Church — Design System

A fresh brand identity for **Roseville New Church**, a Swedenborgian ("New Church") congregation at 4 Shirley Rd, Roseville NSW, Sydney, Australia. Built from scratch in July 2026 — the church had no consistent prior branding.

## Context & sources
- Company brief (this project): historically a "mystic, new-age vibe with purples and rainbow colours"; a hint of Art Deco from the current logo font and Roseville's Art Deco architecture; goal is a **modern, inviting church brand — bright, happy, mystic — not heavy/traditional**.
- rosevillenewchurch.com.au — current site (Wix-based); copy tone sampled from About page and newsletters.
- swedenborg.com.au — the co-located Swedenborg Centre's site; cleaner and more modern, referenced for inspiration only.
- **No logo, font files, Figma, or codebase were provided.** No logo mark exists in this system — render the church name in `--font-display` wherever a mark would go.

## Brand idea: "Dawn light"
Swedenborg's theology centres on illumination — light as divine love and wisdom, a "new day" for Christianity. The system expresses this as **dawn light through stained glass**: deep violet grounding, warm gold sunrise, and a restrained aurora of rose/teal/sky standing in for the old rainbow palette — refined, not carnival. Art Deco lives quietly in the geometric display face (Josefin Sans) and generous symmetry, not in ornament.

## CONTENT FUNDAMENTALS
- **Voice:** warm, sincere, invitational. "We" for the congregation, "you" for the reader. Never preachy or guilt-based; never corporate.
- **Casing:** sentence case everywhere, including headings and buttons ("Join us this Sunday", not "JOIN US THIS SUNDAY"). Eyebrow labels are the one exception: small uppercase with wide tracking.
- **Copy patterns (from real church copy):** "Join us in…", "deepen your spiritual journey", "love and wisdom", "joyful and useful lives". Speak of exploring and understanding, not obligation. Australian English spelling (worshipping, centre, programme).
- **Emoji:** never in headings or body; at most sparingly in casual newsletter contexts.
- **Names:** "Roseville New Church" in full on first mention; "the church" thereafter. Emanuel Swedenborg spelled with one m.
- **Length:** short paragraphs, plain sentences. Scripture or Swedenborg quotes set large in italic serif as feature elements.

## VISUAL FOUNDATIONS
- **Color:** warm paper background (`--surface-page` #FBF9F4), deep violet ink headings, violet-500 primary actions, gold as the warm secondary accent. The aurora hues (rose/teal/sky) appear only as small accents and in the signature `--rnc-gradient-aurora`. Max one gradient moment per screen. Dark sections use `--rnc-gradient-dusk`, never flat black.
- **Type:** Josefin Sans for display/headings/buttons (geometric, quietly Deco; weight 600, +0.02em tracking, light 300 for hero numerals); Lora for body and quotes (17px/1.65). Eyebrows: 13px Josefin uppercase, 0.22em tracking, violet-500 or gold-600.
- **Spacing:** 4px base scale (`--space-1…9`), airy by default — sections breathe at 64–96px. Content max 1120px; prose 680px.
- **Backgrounds:** flat warm paper or soft violet tint (`--surface-tint`); `--rnc-gradient-dawn` for gentle feature bands. No photography textures, no patterns. Photography (when supplied) should be warm, natural light, real people/garden/building — no stock-glossy.
- **Corners & cards:** generous rounding — cards 22px (`--radius-lg`), inputs/buttons pill or 14px. Cards are white on paper with `--shadow-card` (soft violet-tinted) and a hairline `--border-soft`; no colored left-border accents.
- **Shadows:** always violet-tinted rgba(46,26,71,…), soft and low-contrast; `--shadow-lift` on hover for interactive cards.
- **Borders:** hairline 1px in violet-100/200; focus rings are `--shadow-glow` (4px violet-100 halo), never browser default.
- **Animation:** gentle only — `--ease-gentle`, 150ms color/opacity on hover, 280ms transforms. Fades and soft rises; no bounces, no spins.
- **Hover:** darken one step (violet-500→700) or lift (shadow + 2px rise). Press: scale(.98) + darken. Links: violet-700 → rose-500 on hover with soft violet underline.
- **Transparency/blur:** rare; only a translucent paper header (blur 12px) on long scrolling pages.
- **Do not use:** pure black, pure grey neutrals, heavy gothic/traditional church motifs, neon rainbow spreads, blue-purple SaaS gradients on cards.

## ICONOGRAPHY
- **Icon set:** [Lucide](https://lucide.dev) via CDN (`lucide` UMD script or copied SVGs) — 1.5px stroke, rounded caps, matching the light geometric feel. This is a **substitution/choice**: no icon assets were provided. Use stroke `currentColor`, sizes 16/20/24.
- Common glyphs: sun, sunrise, sparkles, heart-handshake, book-open, calendar, map-pin, mail, users.
- No icon font, no emoji-as-icons, no hand-drawn SVGs. A unicode "✦" spark is permitted as a small typographic ornament (eyebrows, list markers).
- **No logo exists in `assets/`** — none was provided and none was invented.

## Index
- `styles.css` — global entry; imports everything in `tokens/` (fonts, colors, typography, spacing, effects).
- `guidelines/` — foundation specimen cards (colors, type, spacing, effects, brand).
- `components/core/` — Button, IconButton, Badge, Tag, Card, Input, Select, Checkbox, Radio, Switch, Tabs, Dialog, Toast, Tooltip (standard set — **intentional additions**, no source inventory existed).
- `ui_kits/website/` — church website UI kit (home page recreation-in-spirit: hero, services, events, newsletter, footer).
- `templates/` — reusable starting templates (added on request).
- `SKILL.md` — agent skill entry point.
- `thumbnail.html` — project tile.
