// Playwright smoke test for /journal against the static export (run `npm run build:pages` first).
// Two Training Grounds runs (one knob changed) are logged on reveal; /journal compares them. Desktop and iPhone 14.
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

  await page.goto(`${origin}${BASE}/journal/`);
  await page.getByTestId("journal-empty").waitFor();
  check(true, `${name}: empty journal shows the hint`);

  await page.goto(`${origin}${BASE}/train/`);
  await page.getByTestId("train-run").waitFor();
  await page.getByTestId("reveal").waitFor({ timeout: 60000 });
  check((await page.getByTestId("hidden-score").count()) === 0, `${name}: hidden score sealed before reveal`);
  await page.getByTestId("reveal").click();
  await page.getByTestId("hidden-score").waitFor();
  await page.waitForTimeout(700); // save debounce
  await page.getByTestId("degree").selectOption("3");
  await page.getByTestId("train-run").click();
  await page.getByTestId("reveal").waitFor({ timeout: 60000 });
  await page.getByTestId("reveal").click();
  await page.getByTestId("hidden-score").waitFor();
  await page.waitForTimeout(700);

  await page.goto(`${origin}${BASE}/journal/`);
  await page.getByTestId("journal-list").waitFor();
  check((await page.getByTestId("journal-entry").count()) === 2, `${name}: two runs logged`);
  // newest first: the degree-3 run is on top (B), the first run below (A)
  await page.getByTestId("pick-b").nth(0).click();
  await page.getByTestId("pick-a").nth(1).click();
  await page.getByTestId("compare").waitFor();
  const v = await page.getByTestId("verdict").getAttribute("data-verdict");
  check(v === "controlled", `${name}: one-knob comparison is controlled (got ${v})`);
  check(/degree/.test(await page.getByTestId("compare").textContent()), `${name}: comparison names degree`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(shots, `journal-${name}.png`), fullPage: true });
  await overflow("journal");
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join("|") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
