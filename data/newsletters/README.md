# Newsletter archive

## Content (in git)

Markdown issues live in [`src/content/newsletters/`](../src/content/newsletters/). Each file has:

- `title`, `date`
- `pdfUrl` — download link (Wix for now, or Vercel Blob after upload)
- `pdfId`, `bytes`, `highlights`

The `/newsletters` page is built from this collection.

## PDFs (~266 MB — not in git)

Too large for Git / lean Vercel deploys. Local copies go in `data/newsletters/pdfs/` (gitignored).

```bash
npm run newsletters:download
```

## Upload to Vercel Blob (cutover-ready hosting)

### 1. Create a Blob store

1. Open your project on [vercel.com](https://vercel.com) (create/import the GitHub repo first if you haven’t).
2. Go to **Storage** → **Create** → **Blob**.
3. Name it something like `rnc-newsletters`.
4. Choose **Public** access (so Download links work without auth).
5. Connect it to the `rnc-web` project — Vercel will add `BLOB_READ_WRITE_TOKEN`.

### 2. Put the token on your machine

In the Vercel project: **Settings → Environment Variables** → copy `BLOB_READ_WRITE_TOKEN`.

Create `.env.local` in the repo root (gitignored):

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### 3. Download (if needed) then upload

```bash
npm run newsletters:download      # ~266 MB to data/newsletters/pdfs/
npm run newsletters:upload-blob   # uploads + rewrites pdfUrl in Markdown
```

The upload script:

- Puts each file at `newsletters/<slug>.pdf` in Blob
- Saves a map to `data/newsletters/blob-urls.json`
- Updates `pdfUrl` in each `src/content/newsletters/*.md`

### 4. Deploy

Commit **only** the Markdown (and `blob-urls.json` if you want a record). Do **not** commit the PDF folder.

```bash
git add src/content/newsletters data/newsletters/blob-urls.json data/newsletters/README.md
git commit -m "Point newsletter downloads at Vercel Blob"
git push
```

Hobby Blob includes **1 GB** storage — this archive (~266 MB) fits.

### If you skip Blob for now

Leave `pdfUrl` pointing at the Wix URLs. Downloads keep working until that site goes away.
