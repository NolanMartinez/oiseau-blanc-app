/**
 * Génère icon-192.png et apple-touch-icon.png
 * Design : fond blanc + "F" géométrique bicolore (cyan / vert Friggo)
 * Usage : node scripts/generate-icons.mjs
 */
import zlib from 'zlib';
import { writeFileSync } from 'fs';

// CRC32 pour PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function makePng(size) {
  // Palette couleurs
  const WHITE  = [255, 255, 255];
  const CYAN   = [112, 200, 242]; // #70C8F2 — Frig
  const GREEN  = [ 49, 153, 102]; // #319966 — go

  const px = new Uint8Array(size * size * 3);

  // Fond blanc
  for (let i = 0; i < size * size; i++) {
    px[i*3]=WHITE[0]; px[i*3+1]=WHITE[1]; px[i*3+2]=WHITE[2];
  }

  // Dessine un rectangle de pixels
  function rect(x1, y1, x2, y2, color) {
    for (let y = Math.max(0,y1); y < Math.min(size,y2); y++)
      for (let x = Math.max(0,x1); x < Math.min(size,x2); x++) {
        const i = (y*size+x)*3;
        px[i]=color[0]; px[i+1]=color[1]; px[i+2]=color[2];
      }
  }

  // ── Lettre "F" centrée ──────────────────────────────────────────
  // Toutes les coordonnées en unités 512, ramenées à `size`
  const s = size / 512;
  const r = (v) => Math.round(v * s);

  // Barre horizontale du bas = lettre bas (GREEN)
  // Montant vertical (CYAN)
  rect(r(90),  r(80),  r(160), r(440), CYAN);   // montant vertical — cyan

  rect(r(90),  r(80),  r(400), r(155), GREEN);  // barre haute     — vert
  rect(r(90),  r(250), r(310), r(325), GREEN);  // barre médiane   — vert

  // Arrondi intérieur de l'angle haut-gauche (petite touche visuelle)
  // En repassant du blanc dans le coin pour adoucir
  const arc = r(12);
  rect(r(90), r(80), r(90)+arc, r(80)+arc, WHITE);

  // ── Petit point vert en bas à droite (représente le "o" de "go") ──
  const dotR = r(38);
  const dotCX = r(360), dotCY = r(400);
  for (let y = dotCY - dotR; y <= dotCY + dotR; y++)
    for (let x = dotCX - dotR; x <= dotCX + dotR; x++) {
      if ((x-dotCX)**2 + (y-dotCY)**2 <= dotR**2) {
        const i = (y*size+x)*3;
        if (i >= 0 && i < px.length-2) {
          px[i]=GREEN[0]; px[i+1]=GREEN[1]; px[i+2]=GREEN[2];
        }
      }
    }

  // Build PNG raw rows
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      raw[y*rowSize+1+x*3]   = px[(y*size+x)*3];
      raw[y*rowSize+1+x*3+1] = px[(y*size+x)*3+1];
      raw[y*rowSize+1+x*3+2] = px[(y*size+x)*3+2];
    }
  }

  const idat = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=2;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('client/public/icon-192.png', makePng(192));
writeFileSync('client/public/apple-touch-icon.png', makePng(180));
console.log('✓ icon-192.png (192×192)');
console.log('✓ apple-touch-icon.png (180×180)');
