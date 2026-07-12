/**
 * tools/qr/generate.mjs — build-time QR generator (SVG, brand-colored)
 *
 * Encodes site URLs (with UTM tags so scans register in GA4 once it's on)
 * into crisp SVG QR codes written to ../../assets/qr/. Re-run if the base URL
 * changes (e.g. a custom domain lands):  node tools/qr/generate.mjs
 */
import QRCode from 'qrcode';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(ROOT, 'assets', 'qr');
mkdirSync(OUT, { recursive: true });

const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const BASE = (cfg.baseUrl || '').replace(/\/+$/, '');

const DARK = '#111110';   // site ink
const LIGHT = '#00000000'; // transparent background

const TARGETS = [
  { name: 'portfolio', url: `${BASE}/?utm_source=cv&utm_medium=qr&utm_campaign=portfolio` },
  { name: 'letter',    url: `${BASE}/cover-letter/?utm_source=cv&utm_medium=qr&utm_campaign=cover_letter` },
];

const opts = {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 1,
  color: { dark: DARK, light: LIGHT },
};

for (const t of TARGETS) {
  const svg = await QRCode.toString(t.url, opts);
  writeFileSync(join(OUT, `${t.name}.svg`), svg);
  console.log(`  ✓ assets/qr/${t.name}.svg  ->  ${t.url}`);
}
console.log('\n✅ QR codes generated.');
