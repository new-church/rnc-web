# Roseville New Church — Website

Astro + Tailwind v4 site for **Roseville New Church** (Sydney Society of the New Church), hosted on Vercel.

Brand reference and design tokens live in [`design-system-claude/`](design-system-claude/) (Claude Design kit). The live site reimplements that UI kit with Tailwind utilities — not the React prototype bundle.

## Stack

- [Astro](https://astro.build) (static output, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- Self-hosted fonts: Josefin Sans + Lora (`@fontsource`)
- Icons: [`@lucide/astro`](https://lucide.dev)

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
2. Framework preset: **Astro** (or Other with Build Command `npm run build`, Output Directory `dist`).
3. Deploy. No adapter or `vercel.json` is required for this static site.

Optional CLI:

```bash
npx vercel
```
