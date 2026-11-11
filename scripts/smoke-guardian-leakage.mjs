// Playwright smoke test for /guardian/leakage against the static export (run `npm run build:pages` first).
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


const BOSSES = [
  { slug: "leakage", name: "Leakage", lab: "metrics-rank", badge: "Clean Split Badge" },
  { slug: "swarm", name: "Imbalance Swarm", lab: "metrics-classify", badge: "Minority Badge" },
];

const browser = await chromium.launch();
for (const B of BOSSES) for (const [name0, opts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone", { ...devices["iPhone 14"] }]]) {
  const name = `${B.slug}-${name0}`;
  const ref = readFileSync(`content/labs/${B.lab}/reference/solution.py`, "utf8");
  const KEY = `neural-clash:guardian-progress:${B.slug}`;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/guardian/${B.slug}`);
  await page.getByTestId("card").waitFor();
  check((await page.locator("h1").innerText()).includes(B.name), `${name}: the boss page names ${B.name}`);
  check((await page.getByTestId("card").innerText()).toLowerCase().includes("trial 1"), `${name}: trial 1 shows a metrics card`);
  await page.screenshot({ path: join(shots, `guardian-${name}-cards.png`), fullPage: true });
  // skip the duel via the remembered-progress path (the Python smoke plays the duel end to end)
  await page.evaluate((k) => sessionStorage.setItem(k, JSON.stringify({ cards: true, lab: false })), KEY);
  await page.reload();
  await page.getByTestId("lab-phase").waitFor();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForSelector("[data-loaded=true]");
  await page.screenshot({ path: join(shots, `guardian-${name}-lab.png`), fullPage: true });
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(ref);
  await page.getByTestId("submit").click();
  await page.getByTestId("training-phase").waitFor({ timeout: 120000 });
  check((await page.getByTestId("guardian").getAttribute("data-phase")) === "training", `${name}: the reference solution passes the Write trial`);
  await page.goto(`${origin}${BASE}/train`);
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  await page.getByTestId("degree").selectOption("2");
  await page.getByTestId("train-run").click();
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  await page.getByTestId("reveal").click();
  await page.getByTestId("save-companion").click();
  await page.getByTestId("saved-companion").waitFor();
  await page.waitForTimeout(800);
  await page.goto(`${origin}${BASE}/guardian/${B.slug}`);
  await page.getByTestId("training-phase").waitFor();
  await page.getByTestId("fight").click();
  await page.getByTestId("skip-fight").click();
  await page.getByTestId("guardian-won").waitFor({ timeout: 10000 });
  check((await page.getByTestId("guardian-won").innerText()).includes(B.badge), `${name}: the ${B.badge} is awarded`);
  await page.screenshot({ path: join(shots, `guardian-${name}-won.png`), fullPage: true });
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${name}: no horizontal overflow`);
  await page.waitForTimeout(800);
  await page.goto(`${origin}${BASE}/guardian/${B.slug}?again=1`);
  await page.getByTestId("already-cleared").waitFor();
  check(true, `${name}: badge persists in the save`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
