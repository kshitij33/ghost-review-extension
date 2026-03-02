/**
 * Pure Node.js PNG generator — no native dependencies.
 * Creates a 128x128 icon: dark background (#0a0a08) with
 * an acid-green circle (#d4f53c) and a dark inner circle (ghost eye).
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 128, H = 128;

// ── CRC32 ───────────────────────────────────────────────────────────────────
function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCrcTable();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) { c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG CHUNK ────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typB = Buffer.from(type, 'ascii');
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typB, data])), 0);
  return Buffer.concat([len, typB, data, crcB]);
}

// ── PIXEL FUNCTION ───────────────────────────────────────────────────────────
function pixel(x, y) {
  const cx = 64, cy = 64;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Outer acid-green circle (r=50)
  if (dist <= 50) {
    // Inner dark cutout (r=34) — creates a ring
    if (dist <= 34) {
      // Small centre acid dot (r=12)
      if (dist <= 12) { return [212, 245, 60]; }
      return [10, 10, 8];
    }
    return [212, 245, 60];
  }
  return [10, 10, 8]; // background
}

// ── BUILD PNG ────────────────────────────────────────────────────────────────
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8]  = 8; // bit depth
ihdrData[9]  = 2; // colour type RGB
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace

// Raw scanlines: 1 filter byte + W*3 RGB bytes each row
const rawRows = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(1 + W * 3);
  row[0] = 0; // filter None
  for (let x = 0; x < W; x++) {
    const [r, g, b] = pixel(x, y);
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  rawRows.push(row);
}
const compressed = zlib.deflateSync(Buffer.concat(rawRows), { level: 9 });

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdrData),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'resources', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Icon written to ${outPath} (${png.length} bytes)`);
