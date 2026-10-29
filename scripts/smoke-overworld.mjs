// Playwright smoke test for /play against the static export (run `npm run build:pages` first).
// Walks to the Lab door, talks to Prof. Okafor, picks a choice, and checks mobile layout.
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
const at = (page) => page.evaluate(() => { const d = document.querySelector("canvas").dataset; return `${d.map}:${d.tx},${d.ty}`; });

const browser = await chromium.launch();
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/play/`);
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(400);
  check((await page.locator("h1").textContent()) === "Python Port", `${name}: starts in Python Port`);
  await page.screenshot({ path: join(shots, `overworld-${name}-port.png`) });

  // Spawn (10,5) → door at (8,3): left x2 is blocked by the bench at (8,5)? go up to the path row 4, then left, then up through the door.
  await tap(page, "ArrowUp");
  await tap(page, "ArrowLeft", 2);
  await tap(page, "ArrowUp");
  check((await at(page)) === "lab:8,9", `${name}: arrived at the Lab entrance (${await at(page)})`);
  check((await page.locator("h1").textContent()) === "Okafor's Lab", `${name}: door warps into the Lab`);
  await page.screenshot({ path: join(shots, `overworld-${name}-lab.png`) });

  // Lab spawn (8,9) facing up. Okafor at (11,7): go right 2 → (10,9)... then up 2 → (10,7) and face right.
  await tap(page, "ArrowRight", 2);
  await tap(page, "ArrowUp", 2);
  await tap(page, "ArrowRight"); // bump into Okafor (11,7): turns to face him
  check((await at(page)) === "lab:10,7", `${name}: stands next to Okafor`);
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(1500);
  check((await page.getByTestId("dialogue-text").textContent()).includes("you made it"), `${name}: Okafor speaks`);
  await page.screenshot({ path: join(shots, `overworld-${name}-dialogue.png`) });
  await page.keyboard.press("Enter"); // first press completes the typewriter
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter"); // second advances to the pitch
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter"); // skips the pitch typewriter, revealing the choices
  await page.getByRole("button", { name: /Yes, explain/ }).waitFor({ timeout: 3000 }).catch(() => {});
  const choices = await page.getByRole("button", { name: /Yes, explain/ }).count();
  check(choices === 1, `${name}: choices appear`);
  await page.getByRole("button", { name: /Yes, explain/ }).click();
  await page.waitForTimeout(1500);
  check((await page.getByTestId("dialogue-text").textContent()).includes("You will implement"), `${name}: choice leads to the briefing line`);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check((await page.getByRole("dialog").count()) === 0, `${name}: dialogue closes`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join(" | ") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
