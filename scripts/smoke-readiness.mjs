// Playwright smoke test for /readiness against the static export (run `npm run build:pages` first).
// Fresh save: all-new queue and a card session. Then a seeded overdue save: rusty Pup, stale Lab on /labs. Desktop and iPhone 14.
// Usage: node scripts/smoke-sync.mjs [screenshotDir]
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

  await page.goto(`${origin}${BASE}/readiness/`);
  await page.getByTestId("readiness").waitFor();
  for (const id of ["applied-ai", "sde-ai", "ml-engineer"]) check((await page.getByTestId(`band-${id}`).textContent()) === "not started", `${name}: ${id} starts at "not started"`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(shots, `readiness-${name}-fresh.png`), fullPage: true });
  await overflow("fresh");

  const seed = (labs) => page.evaluate(async (labs) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("neural-clash-save", 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const cur = (await new Promise((res) => { const r = db.transaction("save", "readonly").objectStore("save").get("current"); r.onsuccess = () => res(r.result); })) ?? { version: 1, name: "Trainer", labs: {} };
    cur.labs = { ...cur.labs, ...labs };
    await new Promise((res) => { const t = db.transaction("save", "readwrite"); t.objectStore("save").put(cur, "current"); t.oncomplete = res; });
  }, labs);
  const score = async (id) => Number(await page.getByTestId(`loop-${id}`).getAttribute("data-score"));
  await seed({ "linear-gd": { passed: true, assisted: true } });
  await page.goto(`${origin}${BASE}/readiness/`);
  await page.getByTestId("readiness").waitFor();
  const helped = await score("ml-engineer");
  await seed({ "linear-gd": { passed: true, assisted: false } });
  await page.goto(`${origin}${BASE}/readiness/`);
  await page.getByTestId("readiness").waitFor();
  const unaided = await score("ml-engineer");
  check(helped > 0 && unaided > helped, `${name}: helped pass counts less than unaided (${helped.toFixed(3)} < ${unaided.toFixed(3)})`);
  check((await page.getByTestId("next-ml-engineer").count()) === 1, `${name}: names a next gap`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(shots, `readiness-${name}-seeded.png`), fullPage: true });
  await overflow("seeded");
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join("|") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
