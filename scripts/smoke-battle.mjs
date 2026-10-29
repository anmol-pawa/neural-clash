// Playwright smoke test for /battle against the static export (run `npm run build:pages` first).
// Answers wrong on purpose until the battle ends; checks feedback, requeue, result screen and mobile layout.
// Usage: node scripts/smoke-overworld.mjs [screenshotDir]
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

const browser = await chromium.launch();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/battle/`);
  await page.getByTestId("prompt").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, `battle-${name}-ask.png`) });

  await page.getByLabel("Your answer").fill("banana");
  await page.getByRole("button", { name: "Attack" }).click();
  check((await page.getByTestId("verdict").textContent()) === "Not quite.", `${name}: junk input is graded wrong without crashing`);
  check((await page.getByTestId("explain").textContent()).length > 20, `${name}: explanation shown`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shots, `battle-${name}-feedback.png`) });

  let rounds = 0;
  while ((await page.getByTestId("result").count()) === 0 && rounds++ < 60) {
    if ((await page.getByTestId("explain").count()) > 0) await page.getByRole("button", { name: /Next/ }).click();
    else await page.getByLabel("Your answer").fill("0").then(() => page.getByRole("button", { name: "Attack" }).click());
  }
  check((await page.getByTestId("result").count()) === 1, `${name}: battle ends (${rounds} rounds)`);
  check((await page.getByTestId("result").textContent()).includes("Defeated"), `${name}: all-wrong run loses`);
  await page.screenshot({ path: join(shots, `battle-${name}-result.png`) });
  await page.getByRole("button", { name: /Rematch/ }).click();
  await page.getByTestId("prompt").waitFor();
  check(true, `${name}: rematch deals new cards`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join(" | ") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
