// Dump a map (or the whole tile sheet) as a PNG: node scripts/art/preview-map.mjs <lab|port|sheet> <out.png> [scale] [timeMs]
import { build } from "esbuild";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , which = "lab", out = "map.png", sc = "3", t = "0"] = process.argv;
const dir = mkdtempSync(join(tmpdir(), "pm-"));
const bundle = join(dir, "b.mjs");
await build({ entryPoints: ["game/maps/render.ts", "game/maps/lab.ts", "game/maps/port-square.ts", "game/sprites/tiles/python-port.ts", "game/sprites/tileset.ts"], bundle: false, outdir: dir, format: "esm", write: true });
await build({
  stdin: {
    contents: `export * from "/home/user/neural-clash/game/maps/render"; export * from "/home/user/neural-clash/game/maps/lab"; export * from "/home/user/neural-clash/game/maps/port-square"; export * from "/home/user/neural-clash/game/sprites/tiles/python-port"; export * from "/home/user/neural-clash/game/sprites/tileset";`,
    resolveDir: process.cwd(),
  },
  bundle: true, format: "esm", outfile: bundle,
});
const m = await import(bundle);
const scale = Number(sc);
let img;
if (which === "sheet") {
  const names = Object.keys(m.PYTHON_PORT_TILES.tiles);
  const cols = 10, cell = 52;
  const W = cols * cell, H = Math.ceil(names.length / cols) * cell;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = 0x55; data[i + 1] = 0x55; data[i + 2] = 0x66; data[i + 3] = 255; }
  names.forEach((n, i) => {
    const tt = m.PYTHON_PORT_TILES.tiles[n];
    const px = m.tileRGBA(m.PYTHON_PORT_TILES, n, 0);
    const ox = (i % cols) * cell + 2, oy = Math.floor(i / cols) * cell + 2;
    for (let y = 0; y < tt.h; y++) for (let x = 0; x < tt.w; x++) { const s = (y * tt.w + x) * 4; if (!px[s + 3]) continue; const d = ((oy + y) * W + ox + x) * 4; data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; }
  });
  img = { w: W, h: H, data };
} else img = m.renderMap(which === "lab" ? m.NEURAL_LAB : m.PORT_SQUARE, m.PYTHON_PORT_TILES, Number(t));
const W = img.w * scale, H = img.h * scale;
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((Math.floor(y / scale)) * img.w + Math.floor(x / scale)) * 4; const d = y * (W * 3 + 1) + 1 + x * 3; raw[d] = img.data[s]; raw[d + 1] = img.data[s + 1]; raw[d + 2] = img.data[s + 2]; }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log("wrote", out, W, H);
