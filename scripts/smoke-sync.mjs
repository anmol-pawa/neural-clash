// Playwright smoke test for /sync against the static export (run `npm run build:pages` first).
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

const DAY = 86_400_000;
const browser = await chromium.launch();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = async (label) => check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name} ${label}: no horizontal overflow`);

  await page.goto(`${origin}${BASE}/sync/`);
  await page.getByTestId("sync-queue").waitFor();
  check(/0 to review · 4 new/.test(await page.getByTestId("sync-queue").textContent()), `${name}: fresh save queues 4 new cards`);
  check((await page.getByTestId("sync-pup").getAttribute("data-rust")) === "0.00", `${name}: fresh Pup is shiny`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, `sync-${name}-fresh.png`) });
  await overflow("summary");

  await page.getByTestId("sync-start").click();
  for (let i = 0; i < 4; i++) {
    const card = page.getByRole("region", { name: "Card" });
    await card.waitFor();
    check((await page.getByTestId("sync-progress").textContent()).includes(`Card ${i + 1} of 4`), `${name}: progress card ${i + 1}`);
    const choices = card.getByRole("group", { name: "Choices" });
    if (await choices.count()) await choices.getByRole("button").first().click();
    else if (await card.getByRole("checkbox").count()) await card.getByRole("button", { name: "Attack" }).click();
    else if (await card.getByLabel("Code").count()) await card.getByRole("button").first().click();
    else { const inputs = card.locator("input"); for (let k = 0; k < (await inputs.count()); k++) await inputs.nth(k).fill("12345"); await card.getByRole("button", { name: "Attack" }).click(); }
    await page.getByTestId("sync-next").waitFor();
    if (i === 0) { await page.screenshot({ path: join(shots, `sync-${name}-feedback.png`) }); await overflow("feedback"); }
    await page.getByTestId("sync-next").click();
  }
  await page.getByTestId("sync-done").waitFor();
  await page.waitForTimeout(700); // save debounce
  await page.screenshot({ path: join(shots, `sync-${name}-done.png`) });

  // Seed overdue reviews for the Pup, then reload.
  await page.evaluate(async (day) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("neural-clash-save", 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const store = (m) => db.transaction("save", m).objectStore("save");
    const cur = await new Promise((res) => { const r = store("readonly").get("current"); r.onsuccess = () => res(r.result); });
    const old = Date.now() - 40 * day;
    cur.srs = { ...cur.srs, "lab:py-moving-average": { box: 2, due: old, last: old - day, reps: 2, lapses: 0 } };
    for (const k of Object.keys(cur.srs)) if (!k.startsWith("lab:")) cur.srs[k] = { box: 1, due: old, last: old - day, reps: 1, lapses: 0 };
    await new Promise((res) => { const t = db.transaction("save", "readwrite"); t.objectStore("save").put(cur, "current"); t.oncomplete = res; });
  }, DAY);
  await page.goto(`${origin}${BASE}/sync/`);
  await page.getByTestId("sync-queue").waitFor();
  await page.waitForTimeout(600);
  check(Number(await page.getByTestId("sync-pup").getAttribute("data-rust")) === 1, `${name}: overdue items rust the Pup fully`);
  check(/Rusty/.test(await page.getByTestId("sync-rust").textContent()), `${name}: rust message shown`);
  check((await page.getByTestId("sync-lab-py-moving-average").count()) === 1, `${name}: stale Lab listed on /sync`);
  await page.screenshot({ path: join(shots, `sync-${name}-rusty.png`) });
  await overflow("rusty summary");
  await page.goto(`${origin}${BASE}/labs/`);
  await page.getByTestId("lab-stale-py-moving-average").waitFor({ timeout: 5000 }).then(() => check(true, `${name}: Lab marked stale on /labs`), () => check(false, `${name}: Lab marked stale on /labs`));
  check(errors.length === 0, `${name}: no console errors${errors.length ? ` (${errors[0]})` : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
