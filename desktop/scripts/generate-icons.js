/**
 * Generate placeholder icons untuk Tauri.
 * Jalankan: node scripts/generate-icons.js
 *
 * Kalau sudah punya logo asli (PNG 1024x1024), pakai:
 *   npx tauri icon path/to/your-logo.png
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../src-tauri/icons');

mkdirSync(iconsDir, { recursive: true });

/**
 * Buat PNG dengan warna solid + huruf "U" (placeholder Upstyle)
 */
function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient biru gelap
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = grad;

  // Rounded rect
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Huruf "U"
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${size * 0.55}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('U', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

for (const { name, size } of sizes) {
  const buf = createIcon(size);
  writeFileSync(join(iconsDir, name), buf);
  console.log(`✓ Generated ${name} (${size}x${size})`);
}

console.log('\nDone! Icons tersimpan di src-tauri/icons/');
console.log('\nCatatan: Ini placeholder icons.');
console.log('Untuk icon final, jalankan:');
console.log('  npx tauri icon path/to/logo-1024x1024.png');
