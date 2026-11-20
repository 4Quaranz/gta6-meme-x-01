// gta6-meme-x-01 — "WANTED: My Social Life" (Node 22, standard library only).
//
// The joke: GTA 6 launched on 19 Nov 2026 after a 13-year wait, and my social
// life has not been seen since the day before launch. The meme is a Vice City
// "WANTED" poster: five wanted stars, a sunset portrait, and the suspect —
// make.fun's white ghost mascot, holding its magenta star coin — because the
// ghost is the one who stole the bounty money. The bottom band sells make.fun
// in the poster's own voice: real money is the reward.
//
// This program does two things, deterministically (no clock, no network, no
// randomness, so both runs write identical bytes):
//   1. Renders the meme from code into meme.png (a PNG encoder built on
//      node:zlib, a 5x7 bitmap font, and shape rasterisers below).
//   2. Copies POST.json from the repository root to the output directory,
//      which is all the gate reads — the house reads the post itself from X.
//
// Run it locally the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// That writes out/meme.png (the picture to post on X) and out/POST.json.

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const BLACK: RGB = [17, 17, 17];
const WHITE: RGB = [255, 255, 255];
const CREAM: RGB = [247, 232, 195];
const MAGENTA: RGB = [230, 0, 126]; // make.fun magenta
const GOLD: RGB = [255, 194, 26];
const SUN_YELLOW: RGB = [255, 243, 176];
const DUSK: RGB = [58, 43, 79]; // palm / skyline silhouette

// ---------------------------------------------------------------------------
// 5x7 bitmap font. '#' is on, '.' is off. Lowercase letters sit on the same
// 7-row grid (x-height rows 2-6, ascenders rows 0-6).
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '•': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01000', '01000', '11110', '01000', '01000', '01000'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB raster, 1024 x 1024.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  const rr = Math.round(r);
  for (let yy = Math.floor(cy) - rr; yy <= Math.ceil(cy) + rr; yy++) {
    for (let xx = Math.floor(cx) - rr; xx <= Math.ceil(cx) + rr; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
    for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
      const dx = (xx - cx) / rx;
      const dy = (yy - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(xx, yy, c);
    }
  }
}

// Vertical gradient over a rectangle, lerped between two colours.
function vGrad(x: number, y: number, w: number, h: number, top: RGB, bottom: RGB): void {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    const c: RGB = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    fillRect(x, y + yy, w, 1, c);
  }
}

// Thick line drawn as a chain of discs.
function thickLine(x0: number, y0: number, x1: number, y1: number, r: number, c: RGB): void {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c);
  }
}

// Scanline polygon fill (even-odd).
function fillPoly(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

function starPoints(cx: number, cy: number, rOuter: number, rInner: number, points = 5): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// Four-pointed sparkle (the make.fun ghost's eyes).
function sparklePoints(cx: number, cy: number, r: number): Array<[number, number]> {
  const k = 0.26;
  return [
    [cx, cy - r],
    [cx + r * k, cy - r * k],
    [cx + r, cy],
    [cx + r * k, cy + r * k],
    [cx, cy + r],
    [cx - r * k, cy + r * k],
    [cx - r, cy],
    [cx - r * k, cy - r * k],
  ];
}

// ---------------------------------------------------------------------------
// Text. One cell is 6 * scale wide (5 px glyph + 1 px gap), 7 * scale tall.
// ---------------------------------------------------------------------------

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 6 * scale - scale;
}

function drawTextRaw(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const glyph = FONT[ch] ?? FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

// Text with a black halo so it stays readable on any background.
function drawText(s: string, x: number, y: number, scale: number, c: RGB, outline: boolean): void {
  if (outline) {
    const d = Math.max(2, Math.round(scale / 3));
    for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, -d], [-d, d], [d, d]] as Array<[number, number]>) {
      drawTextRaw(s, x + dx, y + dy, scale, BLACK);
    }
  }
  drawTextRaw(s, x, y, scale, c);
}

function drawTextCentred(s: string, cx: number, y: number, scale: number, c: RGB, outline: boolean): void {
  drawText(s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c, outline);
}

// ---------------------------------------------------------------------------
// make.fun's ghost mascot: white body with a thick black outline, two black
// four-pointed sparkle eyes, a round little hand holding a magenta coin with
// a white star. (cx, cy) is the head centre; s scales the whole ghost.
// ---------------------------------------------------------------------------

function drawGhost(cx: number, cy: number, s: number): void {
  const headR = 96 * s;
  const bodyTop = cy - 30 * s;
  const bodyH = 170 * s;
  const bodyW = 216 * s;
  const bumpR = 36 * s;
  const bumpY = bodyTop + bodyH;
  // Black outline silhouette, then the white body inside it.
  fillCircle(cx, cy, headR + 10 * s, BLACK);
  fillRect(cx - bodyW / 2 - 10 * s, bodyTop, bodyW + 20 * s, bodyH + 10 * s, BLACK);
  for (const bx of [-72, 0, 72]) {
    fillCircle(cx + bx * s, bumpY, bumpR + 10 * s, BLACK);
  }
  fillCircle(cx, cy, headR, WHITE);
  fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH, WHITE);
  for (const bx of [-72, 0, 72]) {
    fillCircle(cx + bx * s, bumpY, bumpR, WHITE);
  }
  // Sparkle eyes.
  fillPoly(sparklePoints(cx - 44 * s, cy - 22 * s, 21 * s), BLACK);
  fillPoly(sparklePoints(cx + 44 * s, cy - 22 * s, 21 * s), BLACK);
  // Small round mouth.
  fillEllipse(cx, cy + 38 * s, 10 * s, 13 * s, BLACK);
  // Round little hand on the ghost's right, holding the coin.
  fillCircle(cx + 108 * s, cy + 72 * s, 30 * s, BLACK);
  fillCircle(cx + 108 * s, cy + 72 * s, 24 * s, WHITE);
  // Magenta coin with a white star, on a black rim.
  fillCircle(cx + 152 * s, cy + 44 * s, 40 * s, BLACK);
  fillCircle(cx + 152 * s, cy + 44 * s, 34 * s, MAGENTA);
  fillPoly(starPoints(cx + 152 * s, cy + 44 * s, 21 * s, 8.5 * s), WHITE);
}

// Simple palm-tree silhouette for the Vice City portrait edges: a leaning
// trunk with seven fronds that arc up and droop at the tips.
function drawPalm(baseX: number, baseY: number, h: number, lean: number, c: RGB): void {
  const topX = baseX + lean;
  const topY = baseY - h;
  thickLine(baseX, baseY, topX, topY, 6, c);
  for (let i = 0; i < 7; i++) {
    const a = (-168 + i * 28) * (Math.PI / 180);
    const len = 78 - Math.abs(i - 3) * 7;
    const mx = topX + Math.cos(a) * len * 0.6;
    const my = topY + Math.sin(a) * len * 0.6 + 10;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len + 34;
    thickLine(topX, topY, mx, my, 4, c);
    thickLine(mx, my, ex, ey, 4, c);
  }
}

// ---------------------------------------------------------------------------
// PNG encoder (colour type 2, RGB, filter 0 per scanline), via node:zlib.
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The poster, 1024 x 1024.
// ---------------------------------------------------------------------------

function renderMeme(): Buffer {
  // Paper + frame.
  fillRect(0, 0, W, H, BLACK);
  fillRect(14, 14, W - 28, H - 28, CREAM);

  // Top magenta band: WANTED.
  fillRect(14, 14, W - 28, 182, MAGENTA);
  drawTextCentred('WANTED', W / 2, 52, 15, WHITE, true);

  // Five wanted stars.
  for (let i = 0; i < 5; i++) {
    const cx = W / 2 + (i - 2) * 92;
    fillPoly(starPoints(cx, 244, 38, 16), BLACK);
    fillPoly(starPoints(cx, 244, 33, 14), GOLD);
  }

  // Portrait: Vice City sunset, sun, palms, skyline, and the ghost suspect.
  fillRect(70, 292, 884, 354, BLACK);
  vGrad(76, 298, 872, 177, [255, 179, 71], [255, 107, 157]);
  vGrad(76, 475, 872, 165, [255, 107, 157], [124, 92, 255]);
  fillCircle(300, 400, 62, SUN_YELLOW);
  drawPalm(140, 640, 190, 34, DUSK);
  drawPalm(888, 640, 205, -34, DUSK);
  // Skyline along the portrait's bottom edge, kept clear of the ghost.
  const skyline: Array<[number, number, number]> = [
    [76, 64, 78], [140, 44, 62], [184, 84, 96], [268, 52, 70], [320, 74, 88],
    [636, 70, 84], [706, 48, 64], [754, 88, 100], [842, 58, 74], [900, 76, 90],
  ];
  for (const [bx, bw, bh] of skyline) {
    fillRect(bx, 640 - bh, bw, bh, DUSK);
    fillRect(bx + 10, 640 - bh + 12, 8, 10, SUN_YELLOW);
    fillRect(bx + bw - 20, 640 - bh + 30, 8, 10, SUN_YELLOW);
  }
  drawGhost(512, 440, 0.78);

  // The charge sheet.
  drawTextCentred('MY SOCIAL LIFE', W / 2, 668, 8, BLACK, false);
  drawTextCentred('LAST SEEN: NOV 18, 2026', W / 2, 740, 6, BLACK, false);
  drawTextCentred('CRIME: PLAYING GTA 6 SINCE LAUNCH', W / 2, 794, 5, BLACK, false);
  drawTextCentred('VICE CITY • LEONIDA', W / 2, 842, 4, BLACK, false);

  // Bottom magenta band: the reward is real money on make.fun.
  fillRect(14, 884, W - 28, 126, MAGENTA);
  drawTextCentred('REWARD: REAL MONEY ON make.fun', W / 2, 902, 5, WHITE, true);
  drawTextCentred('YOUR AGENT CAN WIN IT TOO', W / 2, 950, 5, WHITE, true);

  return encodePNG();
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'meme.png'), renderMeme());
try {
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}



