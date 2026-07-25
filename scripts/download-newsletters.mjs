#!/usr/bin/env node
/**
 * Download newsletter PDFs from the live Wix site into data/newsletters/pdfs/
 * (gitignored — ~266 MB total). The site serves downloads via pdfUrl in
 * content frontmatter; this archive is a local/offline backup for cutover.
 *
 * Usage: node scripts/download-newsletters.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = path.join(root, 'tmp/newsletters-catalogue.json');
const outDir = path.join(root, 'data/newsletters/pdfs');

if (!fs.existsSync(catalogue)) {
  console.error('Missing tmp/newsletters-catalogue.json — regenerate from the Wix page first.');
  process.exit(1);
}

const items = JSON.parse(fs.readFileSync(catalogue, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

async function download(item) {
  const dest = path.join(outDir, `${item.slug}.pdf`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log('skip', item.slug);
    return;
  }
  console.log('get ', item.slug, `(%s MB)`, (item.bytes / 1024 / 1024).toFixed(1));
  const res = await fetch(item.pdfUrl);
  if (!res.ok) throw new Error(`${item.slug}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(' ok ', item.slug, `${(buf.length / 1024 / 1024).toFixed(1)} MB`);
}

for (const item of items) {
  try {
    await download(item);
  } catch (e) {
    console.error('FAIL', item.slug, e.message);
  }
}
console.log('Done. Files in', outDir);
