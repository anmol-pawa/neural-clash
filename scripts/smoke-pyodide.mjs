// Playwright smoke test for /dev/pyodide against the static export (run `npm run build:pages` first).
// Usage: node scripts/smoke-pyodide.mjs [screenshotDir]
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
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".zip": "application/zip", ".whl": "application/zip", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };

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
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/dev/pyodide/`);

  const t0 = Date.now();
  await page.getByRole("button", { name: "Load runtime" }).click();
  await page.getByTestId("ready").waitFor({ timeout: 120_000 });
  console.log(`${name}: runtime loaded in ${Date.now() - t0} ms (page wall clock)`);

  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByTestId("result").waitFor();
  check((await page.getByTestId("stdout").textContent()).includes("numpy 2."), `${name}: hello prints the numpy version`);

  await page.getByRole("button", { name: "gradient check" }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByTestId("tests").getByText("test_sigmoid_grad").waitFor();
  check((await page.getByTestId("tests").textContent()).includes("✓"), `${name}: correct gradient passes`);

  await page.getByRole("button", { name: "wrong gradient" }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByTestId("tests").getByText("test_grad").waitFor();
  check((await page.getByTestId("tests").textContent()).includes("GradCheckError"), `${name}: wrong gradient is rejected`);

  await page.getByRole("button", { name: "infinite loop (timeout)" }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByTestId("problem").waitFor({ timeout: 15_000 });
  check((await page.getByTestId("problem").textContent()).includes("was stopped"), `${name}: infinite loop times out`);

  const t1 = Date.now();
  await page.getByRole("button", { name: "hello" }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByTestId("stdout").waitFor({ timeout: 120_000 });
  console.log(`${name}: respawn + run after timeout took ${Date.now() - t1} ms`);
  check(true, `${name}: worker respawns after a timeout`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${name}: no horizontal overflow (${overflow}px)`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await page.screenshot({ path: join(shots, `pyodide-${name}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
