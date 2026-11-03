// Playwright smoke test for /labs against the static export (run `npm run build:pages` first).
// Two Training Grounds runs (one knob changed) are logged on reveal; /labs compares them. Desktop and iPhone 14.
// Usage: node scripts/smoke-mart.mjs [screenshotDir]
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

  await page.goto(`${origin}${BASE}/mart/`);
  await page.getByTestId("mart").waitFor();
  check((await page.getByTestId("mart-bits").innerText()).startsWith("0 Bits"), `${name}: starts with 0 Bits`);
  check(await page.getByTestId("buy").first().isDisabled(), `${name}: buy disabled when poor`);
  await page.waitForTimeout(700);
  // give the player 70 Bits
  await page.evaluate(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("neural-clash-save", 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const cur = await new Promise((res) => { const r = db.transaction("save", "readonly").objectStore("save").get("current"); r.onsuccess = () => res(r.result); });
    const next = { ...(cur ?? {}), wallet: { bits: 70, paid: [] } };
    await new Promise((res) => { const t = db.transaction("save", "readwrite"); t.objectStore("save").put(next, "current"); t.oncomplete = res; });
  });
  await page.goto(`${origin}${BASE}/mart/`);
  await page.getByTestId("mart").waitFor();
  check((await page.getByTestId("mart-bits").innerText()).startsWith("70 Bits"), `${name}: seeded 70 Bits`);
  const ember = page.locator('[data-testid="mart-item"][data-id="tint-ember"]');
  await ember.getByTestId("buy").click();
  check((await page.getByTestId("mart-bits").innerText()).startsWith("10 Bits"), `${name}: buying costs 60`);
  await ember.getByTestId("wear").click();
  check((await ember.getByTestId("wear").getAttribute("aria-pressed")) === "true", `${name}: tint worn`);
  const mint = page.locator('[data-testid="mart-item"][data-id="tint-mint"]');
  check(await mint.getByTestId("buy").isDisabled(), `${name}: cannot afford the second tint`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(shots, `mart-${name}.png`) });
  await overflow("mart");
  await page.reload();
  await page.getByTestId("mart").waitFor();
  check((await page.getByTestId("unequip").count()) === 1, `${name}: worn tint persists after reload`);
  check(errors.length === 0, `${name}: no console errors${errors.length ? ` (${errors[0]})` : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
