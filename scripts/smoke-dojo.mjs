// Playwright smoke test for /dojo against the static export (run `npm run build:pages` first).
// Usage: node scripts/smoke-editor.mjs [screenshotDir]
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
const setCode = async (page, text) => {
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(text);
};
const GOOD = `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    unordered_map<long long, int> cnt;
    for (int i = 0; i < n; i++) { long long x; scanf("%lld", &x); cnt[x]++; }
    vector<pair<int, long long>> v;
    for (auto& [id, c] : cnt) v.push_back({-c, id});
    sort(v.begin(), v.end());
    for (int i = 0; i < k; i++) printf("%lld%c", v[i].second, i + 1 < k ? ' ' : '\\n');
}
`;

const VOTE = `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto& x : a) scanf("%lld", &x);
    long long cand = -1;
    int votes = 0;
    for (long long x : a) { if (votes == 0) cand = x; votes += (x == cand) ? 1 : -1; }
    int count = 0;
    for (long long x : a) count += (x == cand);
    printf("%lld\\n", count * 2 > n ? cand : -1LL);
}
`;

for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/dojo/`);
  check((await page.getByTestId("dojo-top-k-tokens").count()) === 1, `${name}: index lists Hot Tokens`);
  await page.getByTestId("dojo-top-k-tokens").click();
  await page.getByTestId("dojo-scout").waitFor();
  await page.screenshot({ path: join(shots, `dojo-scout-${name}.png`), fullPage: true });
  await page.getByTestId("dojo-scouted").click();
  await page.getByTestId("dojo-plan-0").click();
  check(await page.getByTestId("dojo-plan-miss").count() === 1, `${name}: wrong plan is refused`);
  await page.getByTestId("dojo-plan-1").click();
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForTimeout(800);
  // a program that prints nothing: WA costs a heart
  await page.getByTestId("submit").dispatchEvent("click");
  await page.getByTestId("cpp-results").waitFor({ timeout: 120_000 });
  check((await page.getByTestId("dojo-hearts").getAttribute("aria-label")).startsWith("2 of"), `${name}: wrong verdict costs a heart`);
  await page.screenshot({ path: join(shots, `dojo-code-${name}.png`), fullPage: true });
  // the correct solution is accepted and we reach the debrief
  await setCode(page, GOOD);
  await page.getByTestId("submit").dispatchEvent("click");
  await page.getByTestId("dojo-debrief").waitFor({ timeout: 120_000 });
  check((await page.getByTestId("dojo-grade").textContent()).startsWith("Accepted"), `${name}: correct solution reaches an Accepted debrief`);
  await page.screenshot({ path: join(shots, `dojo-debrief-${name}.png`), fullPage: true });
  await page.waitForTimeout(1000); // let the debounced save reach IndexedDB before a hard navigation
  // a second problem (easy, majority vote) played end to end
  await page.goto(`${origin}${BASE}/dojo/`);
  check((await page.getByTestId("dojo-mastery-top-k-tokens").textContent({ timeout: 15000 }).catch(() => "none")) === "learning", `${name}: solved problem shows a spaced-review badge on the index`);
  await page.getByTestId("dojo-label-consensus").click();
  await page.getByTestId("dojo-scouted").click();
  await page.getByTestId("dojo-plan-1").click();
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForTimeout(800);
  await setCode(page, VOTE);
  await page.getByTestId("submit").dispatchEvent("click");
  await page.getByTestId("dojo-debrief").waitFor({ timeout: 120_000 });
  check((await page.getByTestId("dojo-grade").textContent()).startsWith("Accepted"), `${name}: Label Consensus solved end to end`);
  // the reference solutions of two more packages (tree DP, prefix DP), plan option 2 is the right one for all three
  for (const [id, title] of [["worst-hop", "Worst Hop"], ["fewest-tokens", "Fewest Tokens"], ["steady-latency", "Steady Latency"]]) {
    await page.goto(`${origin}${BASE}/dojo/`);
    await page.getByTestId(`dojo-${id}`).click();
    await page.getByTestId("dojo-scouted").click();
    await page.getByTestId("dojo-plan-2").click();
    await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
    await page.locator(".cm-content").first().waitFor();
    await page.waitForTimeout(800);
    await setCode(page, readFileSync(join(process.cwd(), "content", "problems", id, "solution.cpp"), "utf8"));
    await page.getByTestId("submit").dispatchEvent("click");
    await page.getByTestId("dojo-debrief").waitFor({ timeout: 120_000 });
    check((await page.getByTestId("dojo-grade").textContent()).startsWith("Accepted"), `${name}: ${title} solved end to end`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
