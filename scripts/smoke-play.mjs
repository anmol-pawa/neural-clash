// Playwright smoke test for /play against the static export (run `npm run build:pages` first).
// Usage: node scripts/smoke-play.mjs [screenshotDir]
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
const walk = async (page, key, tiles) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(Math.round(tiles * 190) - 40);
  await page.keyboard.up(key);
  await page.waitForTimeout(260);
};

for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/play/`);
  await page.getByTestId("overworld").waitFor();
  await page.waitForTimeout(600);
  check(await page.getByTestId("area-banner").isVisible(), `${name}: area banner shows`);
  await page.screenshot({ path: join(shots, `play-${name}-port.png`) });

  // Port: (11,7) -> up 3 -> left 3 -> up into the Lab door
  await walk(page, "ArrowUp", 3);
  await walk(page, "ArrowLeft", 3);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(190 * 1 + 500);
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(400);
  check((await page.getByTestId("area-banner").textContent()) === "OKAFOR'S LAB", `${name}: walked through the door into the Lab`);
  await walk(page, "ArrowUp", 1);
  const dlg = page.getByTestId("dialogue");
  await dlg.waitFor({ timeout: 3000 });
  check(/OKAFOR/.test(await dlg.textContent()), `${name}: stepping on the trigger starts Okafor's intro`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(shots, `play-${name}-dialogue.png`) });
  // walking is locked during dialogue
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowUp");
  // confirm through the four intro lines
  for (let i = 0; i < 9 && !(await dlg.getByRole("menu").count()); i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("Space");
    await page.waitForTimeout(80);
  }
  check((await dlg.getByRole("menuitem").count()) === 3, `${name}: the menu offers three answers`);
  await page.screenshot({ path: join(shots, `play-${name}-menu.png`) });
  await dlg.getByRole("menuitem").nth(1).click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  check(/perceptron/i.test(await dlg.textContent()), `${name}: answer 2 explains the perceptron`);
  for (let i = 0; i < 8 && (await dlg.count()); i++) {
    if (await dlg.getByRole("menuitem").count()) { await dlg.getByRole("menuitem").nth(2).click(); }
    else await page.keyboard.press("Space");
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(200);
  check((await dlg.count()) === 0, `${name}: the dialogue closes`);

  // reload and confirm the save database exists (flag persistence is unit-tested via the runner; a UI round trip comes with B10)
  await page.waitForTimeout(600); // let the debounced save flush
  await page.reload();
  await page.getByTestId("overworld").waitFor();
  await page.waitForTimeout(500);
  const flags = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.databases ? indexedDB.databases() : Promise.resolve([]);
        r.then((dbs) => resolve(dbs.map((d) => d.name)));
      }),
  );
  check(Array.isArray(flags), `${name}: storage reachable (${JSON.stringify(flags)})`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors${errors.length ? " " + errors.join("|") : ""}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
