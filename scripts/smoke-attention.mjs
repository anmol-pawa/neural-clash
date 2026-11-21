// Playwright smoke test for /dev/attention against the static export (run `npm run build:pages` first).
// Attention map reacts; desktop and iPhone 14.
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
  await page.goto(`${origin}${BASE}/dev/attention/`, { waitUntil: "networkidle" });
  const num = async (id) => Number(await page.textContent(`[data-testid="${id}"]`));
  const e0 = await num("attn-entropy");
  await page.getByRole("button", { name: /Scale by/ }).click();
  await page.getByLabel("Head size").fill("128");
  const e1 = await num("attn-entropy");
  check(e1 < e0 * 0.8, `${name}: unscaled large-d attention saturates (entropy ${e0} -> ${e1})`);
  await page.getByRole("button", { name: /Scale by/ }).click();
  await page.getByRole("button", { name: "Causal mask" }).click();
  const painted = await page.evaluate(() => {
    const cv = document.querySelector('[data-testid="attention-canvas"]');
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let bright = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) bright++;
    return { w: cv.width, bright };
  });
  check(painted.w === 168 && painted.bright > 0, `${name}: canvas painted (${painted.w}px, ${painted.bright} bright px)`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await page.screenshot({ path: join(shots, `attention-${name}.png`), fullPage: true });
  await page.goto(`${origin}${BASE}/learn/#attention-sdpa-lesson`, { waitUntil: "networkidle" });
  check((await page.locator('[data-testid="attention-map"]').count()) === 1, `${name}: map embedded in the attention lesson`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
