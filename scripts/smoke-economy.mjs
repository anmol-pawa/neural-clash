// Playwright smoke test for /labs against the static export (run `npm run build:pages` first).
// Two Training Grounds runs (one knob changed) are logged on reveal; /labs compares them. Desktop and iPhone 14.
// Usage: node scripts/smoke-journal.mjs [screenshotDir]
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
  const overflow = async (label) => check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name} ${label}: no horizontal overflow`);

  await page.goto(`${origin}${BASE}/labs/`);
  await page.getByTestId("mode-picker").waitFor();
  check((await page.getByTestId("bits").innerText()).includes("0 Bits"), `${name}: starts with 0 Bits`);
  const labId = "linear-gd"; // the lab with a hint ladder
  await page.goto(`${origin}${BASE}/labs/#${labId}`);
  await page.getByTestId("lab-hint-next").waitFor();
  await page.getByTestId("lab-hint-next").click();
  check(await page.getByTestId("lab-hint-msg").isVisible(), `${name}: standard mode refuses a hint with 0 Bits`);
  check((await page.getByTestId("lab-hint").count()) === 0, `${name}: no hint leaked`);
  await overflow("lab with hint panel");
  await page.screenshot({ path: join(shots, `economy-${name}-poor.png`) });
  await page.goto(`${origin}${BASE}/labs/`);
  await page.getByTestId("mode-guided").click();
  await page.goto(`${origin}${BASE}/labs/#${labId}`);
  await page.getByTestId("lab-hint-next").click();
  check((await page.getByTestId("lab-hint").count()) === 1, `${name}: guided mode gives a free hint`);
  await page.goto(`${origin}${BASE}/labs/`);
  await page.getByTestId("mode-interview").click();
  await page.waitForTimeout(700);
  await page.goto(`${origin}${BASE}/labs/#${labId}`);
  await page.getByTestId("lab-hints-off").waitFor();
  check(true, `${name}: interview mode switches hints off (persisted)`);
  await page.goto(`${origin}${BASE}/labs/`);
  await overflow("labs index");
  await page.screenshot({ path: join(shots, `economy-${name}-index.png`) });
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
