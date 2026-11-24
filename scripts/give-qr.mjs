// Makes the printable QR code for the giving page (bulletin, signs): public/give-qr.svg and .png.
// The code only links to the page; it holds no bank details. Run: node scripts/give-qr.mjs
import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';

const URL = 'https://www.rosevillenewchurch.com.au/give';
const opts = { margin: 2, errorCorrectionLevel: 'M' };
await writeFile('public/give-qr.svg', await QRCode.toString(URL, { ...opts, type: 'svg' }));
await QRCode.toFile('public/give-qr.png', URL, { ...opts, width: 1200 });
console.log('Wrote public/give-qr.svg and public/give-qr.png for', URL);
