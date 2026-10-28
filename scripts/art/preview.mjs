// Dump a contact sheet PNG of a generated sprite module: node --experimental-strip-types scripts/art/preview.mjs <module> <export> <out.png> [scale]
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
const [, , mod, exp, out, sc = "4"] = process.argv;
const s = (await import(new URL(mod, `file://${process.cwd()}/`))) [exp];
const scale = Number(sc);
const names = Object.keys(s.anims);
const cols = Math.max(...names.map((n) => s.anims[n].length));
const W = cols * (s.w * scale + 4), H = names.length * (s.h * scale + 4);
const buf = Buffer.alloc(W * H * 3, 0);
for (let i = 0; i < W * H; i++) { buf[i*3]=0x7a; buf[i*3+1]=0xb0; buf[i*3+2]=0x6a; }
const hex = (h) => [1,3,5].map((i) => parseInt(h.slice(i, i + 2), 16));
names.forEach((n, r) => s.anims[n].forEach((f, c) => {
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const ch = f[y][x]; if (ch === ".") continue; const rgb = hex(s.palette[ch]);
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = c * (s.w * scale + 4) + x * scale + dx, py = r * (s.h * scale + 4) + y * scale + dy;
      const i = (py * W + px) * 3; buf[i]=rgb[0]; buf[i+1]=rgb[1]; buf[i+2]=rgb[2];
    }
  }
}));
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; buf.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
