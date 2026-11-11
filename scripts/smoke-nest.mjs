// Playwright smoke test for /dev/nest against the static export (run `npm run build:pages` first).
// Data Dojo interactives react; desktop and iPhone 14.
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
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };

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
  await page.goto(`${origin}${BASE}/dev/nest/`, { waitUntil: "networkidle" });
  await page.getByLabel("Hidden units").fill("0");
  const a0 = Number((await page.textContent('[data-testid="xor-acc"]')).replace("%", ""));
  await page.getByLabel("Hidden units").fill("6");
  const a6 = Number((await page.textContent('[data-testid="xor-acc"]')).replace("%", ""));
  check(a0 < 70 && a6 > 95, `${name}: hidden units solve XOR (${a0} -> ${a6})`);
  await page.screenshot({ path: join(shots, `nest-xor-${name}.png`), fullPage: true });
  await page.getByRole("tab", { name: "Depth and init" }).click();
  await page.getByRole("button", { name: "large (1.0)" }).click();
  const big = Number(await page.textContent('[data-testid="flow-ratio"]'));
  await page.getByRole("button", { name: "Xavier" }).click();
  const xav = Number(await page.textContent('[data-testid="flow-ratio"]'));
  check(big > 1000 && xav < 2, `${name}: large init explodes gradients, Xavier is balanced (${big} vs ${xav})`);
  await page.screenshot({ path: join(shots, `nest-flow-${name}.png`), fullPage: true });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
