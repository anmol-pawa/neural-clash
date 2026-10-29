// Playwright smoke test for /battle against the static export (run `npm run build:pages` first).
// Plays the demo deck: known answers hit, everything else counters; checks layout at desktop and iPhone 14.
// Usage: node scripts/smoke-battle.mjs [screenshotDir]
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
// One tap = one tile: a step in flight always completes, so a short press moves exactly one tile.
const tap = async (page, key, n = 1) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.down(key);
    await page.waitForTimeout(40);
    await page.keyboard.up(key);
    await page.waitForTimeout(260);
  }
};

const browser = await chromium.launch();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/battle/`);
  await page.getByTestId("stage").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, `battle-${name}-start.png`) });

  let hits = 0, counters = 0, shotDone = false;
  for (let turn = 0; turn < 40; turn++) {
    if (await page.getByRole("region", { name: "Result" }).count()) break;
    const card = page.getByRole("region", { name: "Card" });
    const prompt = (await card.locator("p").nth(1).textContent()) ?? "";
    if (prompt.includes("nan for logits")) await card.getByRole("button", { name: /Line 3/ }).click();
    else if (prompt.includes("climbs every step")) await card.getByRole("group", { name: "Choices" }).getByRole("button").first().click();
    else if (prompt.includes("99%")) { await card.getByRole("checkbox").nth(0).check(); await card.getByRole("checkbox").nth(1).check(); await card.getByRole("button", { name: "Attack" }).click(); }
    else if (await card.getByRole("group", { name: "Choices" }).count()) await card.getByRole("group", { name: "Choices" }).getByRole("button").nth(1).click();
    else {
      const inputs = card.locator("input");
      for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).fill("12345");
      await card.getByRole("button", { name: "Attack" }).click();
    }
    const fb = page.getByRole("region", { name: "Feedback" });
    await fb.waitFor({ timeout: 3000 }).catch(() => {});
    if (await fb.count()) {
      const head = await fb.locator("h2").textContent();
      if (head.startsWith("Hit")) hits++; else counters++;
      if (!shotDone) { await page.waitForTimeout(350); await page.screenshot({ path: join(shots, `battle-${name}-feedback.png`) }); shotDone = true; }
      await fb.getByRole("button", { name: "Next card" }).click();
    }
  }
  await page.getByRole("region", { name: "Result" }).waitFor({ timeout: 3000 });
  check(hits >= 1 && counters >= 1, `${name}: saw ${hits} hit(s) and ${counters} counter(s)`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, `battle-${name}-result.png`) });
  check((await page.getByRole("heading", { level: 2 }).textContent()).includes("out of hearts"), `${name}: losing by wrong answers ends the battle`);
  await page.getByRole("button", { name: "Battle again" }).click();
  check((await page.getByRole("region", { name: "Card" }).count()) === 1, `${name}: restart deals a new card`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join(" | ") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
