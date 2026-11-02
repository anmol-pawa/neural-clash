// Playwright smoke test for /labs against the static export (run `npm run build:pages` first).
// Opens the lesson list and one lesson; checks layout, output blocks and console at desktop and iPhone 14.
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

const ref = readFileSync("content/labs/linear-gd/reference/solution.py", "utf8");
const browser = await chromium.launch();
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["iphone", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/labs`);
  await page.getByTestId("lab-linear-gd").waitFor();
  const n = await page.locator("[data-testid^=lab-]").count();
  check(n >= 19, `${name}: labs listed (${n})`);
  await page.screenshot({ path: join(shots, `labs-list-${name}.png`) });
  await page.getByTestId("lab-linear-gd").click();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForSelector("[data-loaded=true]");
  check((await page.getByTestId("lab-hint").count()) === 0, `${name}: hints start hidden`);
  await page.getByTestId("lab-hint-next").click();
  await page.getByTestId("lab-hint-next").click();
  check((await page.getByTestId("lab-hint").count()) === 2, `${name}: hint ladder reveals one rung per click`);
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(ref);
  await page.getByTestId("submit").click();
  await page.getByTestId("summary").waitFor({ timeout: 90000 });
  check((await page.getByTestId("summary").innerText()).includes("accepted"), `${name}: reference accepted on Submit`);
  await page.getByTestId("lab-solved").waitFor();
  check(true, `${name}: solved banner shown`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  await page.screenshot({ path: join(shots, `labs-lab-${name}.png`), fullPage: true });
  await page.waitForTimeout(800); // save debounce
  await page.goto(`${origin}${BASE}/labs?again=1`);
  await page.getByText("✓ solved").first().waitFor();
  check(true, `${name}: solved state persists in list`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
