#!/usr/bin/env node
/**
 * Upload local newsletter PDFs to Vercel Blob and rewrite pdfUrl in
 * src/content/newsletters/*.md to the Blob URLs.
 *
 * Prerequisites:
 * 1. Create a Blob store in the Vercel dashboard (Storage → Blob)
 * 2. Copy BLOB_READ_WRITE_TOKEN into .env.local
 * 3. Finish: npm run newsletters:download
 *
 * Usage: npm run newsletters:upload-blob
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfDir = path.join(root, 'data/newsletters/pdfs');
const contentDir = path.join(root, 'src/content/newsletters');
const mapPath = path.join(root, 'data/newsletters/blob-urls.json');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvLocal();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(`
Missing BLOB_READ_WRITE_TOKEN.

1. Vercel dashboard → your project → Storage → Create Blob store (Public)
2. Connect it to this project so the token is created
3. Copy BLOB_READ_WRITE_TOKEN into .env.local in the repo root
`);
  process.exit(1);
}

if (!fs.existsSync(pdfDir)) {
  console.error('No PDFs found. Run: npm run newsletters:download');
  process.exit(1);
}

const pdfs = fs.readdirSync(pdfDir).filter((f) => f.endsWith('.pdf'));
if (pdfs.length === 0) {
  console.error('PDF folder is empty. Run: npm run newsletters:download');
  process.exit(1);
}

const urlMap = fs.existsSync(mapPath)
  ? JSON.parse(fs.readFileSync(mapPath, 'utf8'))
  : {};

console.log(`Uploading ${pdfs.length} PDFs to Vercel Blob…`);

for (const file of pdfs) {
  const slug = file.replace(/\.pdf$/, '');
  const pathname = `newsletters/${file}`;
  const localPath = path.join(pdfDir, file);

  if (urlMap[slug]?.startsWith('https://')) {
    console.log('skip (already mapped)', slug);
    continue;
  }

  const body = fs.readFileSync(localPath);
  console.log('put ', slug, `${(body.length / 1024 / 1024).toFixed(1)} MB`);

  const blob = await put(pathname, body, {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  urlMap[slug] = blob.url;
  console.log(' → ', blob.url);
  fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2) + '\n');
}

// Rewrite markdown frontmatter pdfUrl fields
let updated = 0;
for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const blobUrl = urlMap[slug];
  if (!blobUrl) {
    console.warn('no blob url for', slug);
    continue;
  }
  const mdPath = path.join(contentDir, file);
  let md = fs.readFileSync(mdPath, 'utf8');
  const next = md.replace(/^pdfUrl: .*$/m, `pdfUrl: ${blobUrl}`);
  if (next !== md) {
    fs.writeFileSync(mdPath, next);
    updated++;
    console.log('md ', slug);
  }
}

fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2) + '\n');
console.log(`\nDone. Updated ${updated} markdown files.`);
console.log('URL map:', mapPath);
console.log('Commit the markdown changes (not the PDFs), then redeploy.');
