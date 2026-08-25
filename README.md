# Roseville New Church — Website

Astro + Tailwind v4 site for **Roseville New Church** (Sydney Society of the New Church), hosted on Vercel.

Brand reference and design tokens live in [`design-system-claude/`](design-system-claude/) (Claude Design kit). The live site reimplements that UI kit with Tailwind utilities — not the React prototype bundle.

## Stack

- [Astro](https://astro.build) (static pages + Vercel adapter for `/api/calendar`)
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- Self-hosted fonts: Josefin Sans + Lora (`@fontsource`)
- Icons: [`@lucide/astro`](https://lucide.dev)
- Optional member/CRM store: [`docs/items-table.md`](docs/items-table.md) (Supabase single-table)

## Calendar

`/events` shows a custom month view fed by a published Outlook ICS URL.

Set in `.env.local` (and Vercel project env):

```bash
PUBLIC_CALENDAR_ICS_URL="https://outlook.office365.com/owa/calendar/.../calendar.ics"
CALENDAR_ICS_URL="https://outlook.office365.com/owa/calendar/.../calendar.ics"
```

Publish the calendar from Outlook on the web: **Settings → Calendar → Shared calendars → Publish a calendar** (permission: *Can view all details*). Prefer **AUS Eastern Standard Time** on the mailbox so times match Sydney.

## Local development

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  styles/global.css     # Tailwind + @theme design tokens
  layouts/BaseLayout.astro
  components/           # Button, Card, Badge, Input, Tabs, Header, Footer
  pages/                # /, /about, /events
design-system-claude/   # Design reference only
```

## Newsletters

Past issues are listed at `/newsletters`, driven by Markdown in `src/content/newsletters/`. PDF downloads currently point at the Wix-hosted files (~266 MB total — too large for Git/Vercel). See [`data/newsletters/README.md`](data/newsletters/README.md) for Blob upload steps. Local mirror: `npm run newsletters:download`. Upload to Blob: `npm run newsletters:upload-blob` (needs `BLOB_READ_WRITE_TOKEN` in `.env.local`).


1. Import the GitHub repo [`new-church/rnc-web`](https://github.com/new-church/rnc-web) in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Astro**.
3. Add `PUBLIC_CALENDAR_ICS_URL` and `CALENDAR_ICS_URL` (same published `.ics` link).
4. Deploy. The Vercel adapter serves static pages plus `/api/calendar`.

Optional CLI:

```bash
npx vercel
```
