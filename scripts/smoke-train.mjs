// Playwright smoke test for /train against the static export (run `npm run build:pages` first).
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
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/train`);
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  check(true, `${name}: first run finishes and offers the reveal`);
  check((await page.getByTestId("revealed").count()) === 0, `${name}: hidden score sealed before reveal`);
  const lin = parseFloat((await page.getByTestId("train-score").innerText()));
  // XOR with degree 1 must be near chance; degree 2 must solve it.
  await page.getByTestId("reveal").click();
  const hid1 = parseFloat(await page.getByTestId("hidden-score").innerText());
  check(hid1 < 75, `${name}: XOR with a straight line stays weak (${hid1}%, train ${lin}%)`);
  await page.getByTestId("skip-fight").click();
  check((await page.getByTestId("fight-result").innerText()).includes("escaped"), `${name}: a straight line cannot finish the minion`);
  await page.screenshot({ path: join(shots, `train-xor-d1-${name}.png`), fullPage: true });
  await page.getByTestId("degree").selectOption("2");
  await page.getByTestId("train-run").click();
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  await page.getByTestId("reveal").click();
  const hid2 = parseFloat(await page.getByTestId("hidden-score").innerText());
  check(hid2 > 90, `${name}: degree 2 solves XOR on the hidden set (${hid2}%)`);
  check((await page.getByTestId("stats").innerText()).includes("Attack"), `${name}: companion stats shown`);
  await page.getByTestId("save-companion").click();
  check((await page.getByTestId("saved-companion").innerText()).includes("ATK"), `${name}: companion saved and shown`);
  await page.getByTestId("fight").click();
  await page.getByTestId("fight-log").filter({ hasText: "Round" }).waitFor({ timeout: 5000 });
  await page.getByTestId("skip-fight").click();
  check((await page.getByTestId("fight-result").innerText()).includes("Victory"), `${name}: degree 2 beats the minion`);
  await page.screenshot({ path: join(shots, `train-xor-d2-${name}.png`), fullPage: true });
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
