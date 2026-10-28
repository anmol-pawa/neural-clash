// Regenerates the app icons from the seed sprite in lib/seedSprite.ts (nearest-neighbour, no deps).
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const src = readFileSync("lib/seedSprite.ts", "utf8");
const rows = [...src.matchAll(/^  "([^"]+)",$/gm)].map((m) => m[1]);
const pal = Object.fromEntries([...src.matchAll(/^  (\w): "#(\w{6})",$/gm)].map((m) => [m[1], [0, 2, 4].map((i) => parseInt(m[2].slice(i, i + 2), 16))]));
const BG = [10, 8, 32];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(size) {
  const w = rows[0].length;
  const h = rows.length;
  const scale = Math.floor((size * 0.7) / w);
  const ox = Math.floor((size - w * scale) / 2);
  const oy = Math.floor((size - h * scale) / 2);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - ox) / scale);
      const gy = Math.floor((y - oy) / scale);
      const ch = gx >= 0 && gy >= 0 && gx < w && gy < h ? rows[gy][gx] : ".";
      const rgb = ch === "." ? BG : pal[ch];
      raw.set(rgb, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [size, file] of [[192, "public/icon-192.png"], [512, "public/icon-512.png"], [180, "app/apple-icon.png"], [64, "app/icon.png"]]) writeFileSync(file, png(size));
console.log("icons written");
