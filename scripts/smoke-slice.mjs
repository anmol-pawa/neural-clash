// Slice playthrough: visits every player-facing route on the static export at desktop and iPhone 14,
// screenshots each, and fails on console errors, page errors or horizontal overflow.
// Run `npm run build:pages` first. Usage: node scripts/smoke-slice.mjs [shotsDir]
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

const routes = ["/", "/sync", "/companion", "/play", "/learn", "/battle", "/labs", "/train", "/guardian"];
const browser = await chromium.launch();
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["iphone", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(opts);
  for (const r of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${origin}${BASE}${r === "/" ? "/" : r + "/"}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, small: [...document.querySelectorAll("button,a")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 30; }).length }));
    const tag = `${name}${r.replace(/\//g, "-") || "-home"}`;
    await page.screenshot({ path: join(shots, `slice-${tag}.png`), fullPage: false });
    check(o.sw <= o.cw + 1, `${tag}: no horizontal overflow (${o.sw}/${o.cw})`);
    check(errors.length === 0, `${tag}: no console errors${errors.length ? " -> " + errors.slice(0, 2).join(" | ") : ""}`);
    if (name === "iphone") console.log(`INFO ${tag}: ${o.small} buttons/links under 30px tall`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
