// Playwright smoke test for /dev/tiles against the static export (run `npm run build:pages` first).
// Usage: node scripts/smoke-tiles.mjs [screenshotDir]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const BASE = "/neural-clash";
const out = join(process.cwd(), "out");
const shots = process.argv[2] ?? join(process.cwd(), ".cache", "shots");
mkdirSync(shots, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".zip": "application/zip", ".whl": "application/zip", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (!url.pathname.startsWith(BASE)) return void res.writeHead(404).end();
  let p = normalize(join(out, url.pathname.slice(BASE.length)));
  if (!p.startsWith(out)) return void res.writeHead(403).end();
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const origin = `http://127.0.0.1:${server.address().port}`;

let failed = false;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) failed = true; };

const browser = await chromium.launch();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/dev/tiles/`);
  await page.waitForSelector('canvas[aria-label="Neural Lab"]');
  await page.waitForTimeout(800);
  check(await page.locator("canvas").count() > 50, `${name}: maps and every tile render`);
  const lab = await page.locator('canvas[aria-label="Neural Lab"]').evaluate((c) => ({ w: c.width, h: c.height, px: Array.from(c.getContext("2d").getImageData(c.width / 2, c.height / 2, 1, 1).data) }));
  check(lab.w === 640 && lab.h === 448 && lab.px[3] === 255, `${name}: lab canvas is 640x448 and painted`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await page.screenshot({ path: join(shots, `tiles-${name}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
