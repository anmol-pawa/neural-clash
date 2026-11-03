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

const GOOD2 = `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    scanf("%d", &n);
    vector<pair<long long, long long>> v(n);
    for (auto& [l, r] : v) scanf("%lld %lld", &l, &r);
    sort(v.begin(), v.end());
    long long ranges = 1, covered = 0, cl = v[0].first, cr = v[0].second;
    for (int i = 1; i < n; i++) {
        if (v[i].first <= cr + 1) cr = max(cr, v[i].second);
        else { ranges++; covered += cr - cl + 1; cl = v[i].first; cr = v[i].second; }
    }
    covered += cr - cl + 1;
    printf("%lld\\n%lld\\n", ranges, covered);
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
  // second problem: Context Stitcher
  await page.goto(`${origin}${BASE}/dojo/`);
  check((await page.getByTestId("dojo-context-stitcher").count()) === 1, `${name}: index lists Context Stitcher`);
  await page.getByTestId("dojo-context-stitcher").click();
  await page.getByTestId("dojo-scouted").click();
  await page.getByTestId("dojo-plan-1").click();
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  await page.locator(".cm-content").first().waitFor();
  await page.waitForTimeout(800);
  await setCode(page, GOOD2);
  await page.getByTestId("submit").dispatchEvent("click");
  await page.getByTestId("dojo-debrief").waitFor({ timeout: 120_000 });
  check((await page.getByTestId("dojo-grade").textContent()).startsWith("Accepted"), `${name}: Context Stitcher solution is Accepted`);
  await page.screenshot({ path: join(shots, `dojo-stitcher-${name}.png`), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, `${name}: no horizontal overflow`);
  check(errors.length === 0, `${name}: no console errors ${errors.join("|")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
