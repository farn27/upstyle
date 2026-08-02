/**
 * Generate minimal placeholder icons untuk Tauri (tanpa dependencies eksternal).
 * Pakai raw PNG binary format.
 * 
 * Jalankan: node scripts/gen-icons.cjs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, '../src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });

/**
 * Buat raw PNG buffer dari pixel data RGBA
 */
function createPNG(width, height, getPixel) {
  // Buat image data
  const imageData = [];
  for (let y = 0; y < height; y++) {
    imageData.push(0); // filter byte per row
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      imageData.push(r, g, b, a);
    }
  }

  const raw = Buffer.from(imageData);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crc = crc32(crcData);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (no alpha for ICO compat)
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Pixel renderer: kotak biru gelap + huruf "U" putih
 */
function getPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.18;

  // Rounded rect check (corner radius)
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - r), 0);
  const inRect = dx * dx + dy * dy <= r * r;

  if (!inRect) {
    // Transparent di luar rounded rect
    return [0, 0, 0, 0];
  }

  // Background gradient biru gelap
  const t = (x + y) / (w + h);
  const bg_r = Math.round(15 + t * 10);
  const bg_g = Math.round(23 + t * 20);
  const bg_b = Math.round(42 + t * 50);

  // Huruf "U" sederhana pakai bounding box
  const fontSize = h * 0.55;
  const fontX = cx - fontSize * 0.28;
  const fontY = cy - fontSize * 0.5;
  const fontW = fontSize * 0.56;
  const fontH = fontSize;
  const thick = fontSize * 0.15;

  // "U" shape: dua garis vertikal + satu setengah lingkaran bawah
  const inLeftBar = x >= fontX && x <= fontX + thick && y >= fontY && y <= fontY + fontH * 0.65;
  const inRightBar = x >= fontX + fontW - thick && x <= fontX + fontW && y >= fontY && y <= fontY + fontH * 0.65;

  // Kurva bawah U (simplified sebagai rect melengkung)
  const bottomY = fontY + fontH * 0.55;
  const bottomH = fontH * 0.3;
  const inBottom = y >= bottomY && y <= bottomY + bottomH &&
    x >= fontX && x <= fontX + fontW;

  // Inner cutout untuk U shape
  const innerX = fontX + thick;
  const innerW = fontW - thick * 2;
  const innerCutout = x >= innerX && x <= innerX + innerW &&
    y >= bottomY && y <= bottomY + bottomH * 0.55;

  const inU = (inLeftBar || inRightBar || inBottom) && !innerCutout;

  if (inU) {
    return [56, 189, 248, 255]; // biru terang #38bdf8
  }

  return [bg_r, bg_g, bg_b, 255];
}

// Generate sizes
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

for (const { name, size } of sizes) {
  const buf = createPNG(size, size, getPixel);
  fs.writeFileSync(path.join(iconsDir, name), buf);
  console.log(`✓ ${name} (${size}x${size})`);
}

// Buat icon.ico dari 32x32 PNG (minimal ICO format)
// ICO = 1 image entry pointing ke PNG data
function createICO(pngBuffer) {
  // ICONDIR header
  const icondir = Buffer.alloc(6);
  icondir.writeUInt16LE(0, 0);  // reserved
  icondir.writeUInt16LE(1, 2);  // type: ICO
  icondir.writeUInt16LE(1, 4);  // count: 1 image

  // ICONDIRENTRY
  const entry = Buffer.alloc(16);
  entry[0] = 32;   // width
  entry[1] = 32;   // height
  entry[2] = 0;    // color count
  entry[3] = 0;    // reserved
  entry.writeUInt16LE(1, 4);   // planes
  entry.writeUInt16LE(32, 6);  // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);  // size of image data
  entry.writeUInt32LE(6 + 16, 12);           // offset to image data

  return Buffer.concat([icondir, entry, pngBuffer]);
}

const png32 = createPNG(32, 32, getPixel);
const icoBuffer = createICO(png32);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
console.log('✓ icon.ico');

console.log('\nDone! Semua icons tersimpan di src-tauri/icons/');
console.log('Ganti dengan logo asli nanti pakai: npx tauri icon your-logo.png');
