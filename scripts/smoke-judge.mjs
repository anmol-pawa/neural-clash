// Playwright smoke test for /dev/judge against the static export (run `npm run build:pages` first).
// Usage: node scripts/smoke-judge.mjs [screenshotDir]
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
const pick = async (page, name) => page.getByRole("button", { name, exact: true }).click();
const submit = async (page) => page.getByRole("button", { name: "Submit", exact: true }).click();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/dev/judge/`);

  const t0 = Date.now();
  await page.getByRole("button", { name: "Load compiler" }).click();
  await page.getByTestId("ready").waitFor({ timeout: 180_000 });
  console.log(`${name}: toolchain loaded in ${Date.now() - t0} ms (page wall clock)`);

  const verdictOf = async () => {
    await page.getByTestId("verdict").waitFor({ timeout: 60_000 });
    return page.getByTestId("overall").textContent();
  };
  const t1 = Date.now();
  await submit(page);
  check((await verdictOf()) === "AC", `${name}: correct sort is accepted`);
  console.log(`${name}: compile + 3 runs took ${Date.now() - t1} ms`);

  await pick(page, "wrong answer");
  await submit(page);
  check((await verdictOf()) === "WA", `${name}: wrong answer is rejected`);

  await pick(page, "runtime error");
  await submit(page);
  check((await verdictOf()) === "RE", `${name}: assert failure is a runtime error`);

  await pick(page, "infinite loop (TLE)");
  await submit(page);
  check((await verdictOf()) === "TLE", `${name}: infinite loop hits the time limit`);

  await pick(page, "compile error");
  await submit(page);
  await page.getByTestId("compile-error").waitFor({ timeout: 60_000 });
  const ce = await page.getByTestId("compile-error").textContent();
  check(ce.includes("undeclared identifier 'y'") && ce.includes("Hint:"), `${name}: compile error shows the message and a hint`);

  await pick(page, "sort (accepted)");
  await submit(page);
  check((await verdictOf()) === "AC", `${name}: judge still works after a timeout`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${name}: no horizontal overflow (${overflow}px)`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await page.screenshot({ path: join(shots, `judge-${name}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
