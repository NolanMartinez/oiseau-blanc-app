/**
 * Génère icon-192.png et apple-touch-icon.png pour les push notifications.
 * Fond vert Friggo (#319966), lettre F blanche centrée.
 * Usage : node scripts/generate-icons.mjs
 */
import zlib from 'zlib';
import { writeFileSync } from 'fs';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function makePng(size) {
  const [bgR, bgG, bgB] = [49, 153, 102]; // #319966

  // Draw pixels into a flat RGBA buffer
  const pixels = new Uint8Array(size * size * 3);
  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = bgR;
    pixels[i * 3 + 1] = bgG;
    pixels[i * 3 + 2] = bgB;
  }

  // Draw a white "F" letter (simple pixel font scaled to icon size)
  const scale = size / 192;
  const fCol = Math.round(48 * scale);  // start x
  const fRow = Math.round(52 * scale);  // start y
  const fW   = Math.round(96 * scale);  // total width of F
  const fH   = Math.round(88 * scale);  // total height
  const thick = Math.round(16 * scale); // stroke thickness
  const midY  = Math.round(44 * scale); // midbar offset from fRow
  const midW  = Math.round(64 * scale); // midbar width

  function fillRect(x, y, w, h) {
    for (let row = y; row < Math.min(y + h, size); row++) {
      for (let col = x; col < Math.min(x + w, size); col++) {
        const idx = (row * size + col) * 3;
        pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255;
      }
    }
  }

  // Vertical bar
  fillRect(fCol, fRow, thick, fH);
  // Top bar
  fillRect(fCol, fRow, fW, thick);
  // Mid bar
  fillRect(fCol, fRow + midY, midW, thick);

  // Build PNG raw rows (filter byte + RGB per row)
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      raw[y * rowSize + 1 + x * 3]     = pixels[(y * size + x) * 3];
      raw[y * rowSize + 1 + x * 3 + 1] = pixels[(y * size + x) * 3 + 1];
      raw[y * rowSize + 1 + x * 3 + 2] = pixels[(y * size + x) * 3 + 2];
    }
  }

  const idat = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('client/public/icon-192.png', makePng(192));
writeFileSync('client/public/apple-touch-icon.png', makePng(180));
console.log('✓ client/public/icon-192.png (192×192)');
console.log('✓ client/public/apple-touch-icon.png (180×180)');
