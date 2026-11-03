// Playwright smoke test for /guardian against the static export (run `npm run build:pages` first).
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


const deck = JSON.parse(readFileSync("content/decks/python-port.json", "utf8")).cards;
const norm = (s) => s.replace(/\s+/g, "");
const byKey = new Map(deck.map((c) => [`${c.prompt}|${norm((c.code ?? []).join(""))}`, c]));
const ref = readFileSync("content/labs/py-moving-average/reference/solution.py", "utf8");

async function answerCard(page) {
  const prompt = (await page.locator("[aria-label=Card] p").nth(1).innerText()).trim();
  const code = (await page.locator("[aria-label=Card] pre[aria-label=Code]").count()) ? await page.locator("[aria-label=Card] pre[aria-label=Code]").innerText() : "";
  const c = byKey.get(`${prompt}|${norm(code)}`) ?? deck.find((d) => d.kind === "bug" && d.prompt === prompt);
  if (!c) throw new Error(`unknown card: ${prompt}`);
  if (c.kind === "mcq") await page.locator("[aria-label=Choices] button").nth(c.answer).click();
  else if (c.kind === "multi") { for (const i of c.answers) await page.locator("[aria-label=Card] input[type=checkbox]").nth(i).check(); await page.getByRole("button", { name: "Attack" }).click(); }
  else await page.locator(`[aria-label=Card] button[aria-label^="Line ${c.line}:"]`).click();
}

const browser = await chromium.launch();
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/guardian`);
  await page.getByTestId("phase-strip").waitFor();
  await page.getByTestId("card").waitFor();
  check((await page.getByTestId("phase-strip").innerText()).includes("Write"), `${name}: phase strip shows the three trials`);
  await page.screenshot({ path: join(shots, `guardian-cards-${name}.png`), fullPage: true });
  for (let i = 0; i < 12 && (await page.getByTestId("to-lab").count()) === 0; i++) {
    await answerCard(page);
    await page.waitForTimeout(80);
    const next = page.getByTestId("next-card");
    if (await next.count()) await next.click();
  }
  await page.getByTestId("to-lab").waitFor();
  check(true, `${name}: trial 1 cleared by correct answers`);
  await page.getByTestId("to-lab").click();
  await page.getByTestId("lab-phase").waitFor();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForSelector("[data-loaded=true]");
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("def moving_average(xs, w):\n    return []\n");
  await page.getByTestId("submit").click();
  await page.getByTestId("summary").waitFor({ timeout: 90000 });
  check((await page.getByTestId("guardian").getAttribute("data-phase")) === "lab", `${name}: a wrong submission keeps you in the Write trial`);
  await page.screenshot({ path: join(shots, `guardian-lab-${name}.png`), fullPage: true });
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(ref);
  await page.getByTestId("submit").click();
  await page.getByTestId("training-phase").waitFor({ timeout: 90000 });
  check((await page.getByTestId("no-companion").count()) === 1, `${name}: training trial asks for a saved companion`);
  // train and save a companion (degree-2 logistic solves XOR), then come back: progress is remembered
  await page.goto(`${origin}${BASE}/train`);
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  await page.getByTestId("degree").selectOption("2");
  await page.getByTestId("train-run").click();
  await page.getByTestId("reveal").waitFor({ timeout: 30000 });
  await page.getByTestId("reveal").click();
  await page.getByTestId("save-companion").click();
  await page.getByTestId("saved-companion").waitFor();
  await page.waitForTimeout(800); // save debounce
  await page.goto(`${origin}${BASE}/guardian`);
  await page.getByTestId("training-phase").waitFor();
  check((await page.getByTestId("guardian").getAttribute("data-phase")) === "training", `${name}: cleared trials are remembered`);
  await page.getByTestId("fight").click();
  await page.getByTestId("skip-fight").click();
  await page.getByTestId("guardian-won").waitFor({ timeout: 10000 });
  check(true, `${name}: the hidden-set fight wins and the badge is awarded`);
  await page.screenshot({ path: join(shots, `guardian-won-${name}.png`), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  await page.waitForTimeout(800);
  await page.goto(`${origin}${BASE}/guardian?again=1`);
  await page.getByTestId("already-cleared").waitFor();
  check(true, `${name}: badge persists in the save`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
