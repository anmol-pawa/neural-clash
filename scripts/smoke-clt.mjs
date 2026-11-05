// Playwright smoke test for /dev/clt against the static export (run `npm run build:pages` first).
// Presets, sliders and readouts react; desktop and iPhone 14.
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
  await page.goto(`${origin}${BASE}/dev/clt/`, { waitUntil: "networkidle" });
  const sd = async () => Number((await page.textContent('[data-testid="clt-skew"]')).match(/skewness (-?[\d.]+)/)[1]);
  const skew1 = await sd();
  check(skew1 > 1.5, `${name}: exponential single draws are skewed (${skew1})`);
  await page.getByLabel("Draws per average").fill("100");
  await page.waitForTimeout(300);
  const skew100 = await sd();
  check(Math.abs(skew100) < 0.5, `${name}: averages of 100 are near-normal (${skew100})`);
  await page.getByRole("tab", { name: "Base rates" }).click();
  check((await page.textContent('[data-testid="bayes-ppv"]')).includes("15.4%"), `${name}: default test is only 15.4% precise`);
  await page.getByRole("tab", { name: "Peeking" }).click();
  const peek = Number((await page.textContent('[data-testid="peek-peeking"]')).replace("%", ""));
  const fixed = Number((await page.textContent('[data-testid="peek-fixed"]')).replace("%", ""));
  check(peek > 2 * fixed, `${name}: peeking (${peek}%) inflates false positives over fixed horizon (${fixed}%)`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await page.screenshot({ path: join(shots, `clt-${name}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
