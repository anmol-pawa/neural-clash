// Playwright smoke test for /dev/editor against the static export (run `npm run build:pages` first).
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
const editor = (page) => page.locator(".cm-content").first();
const setCode = async (page, text) => {
  await editor(page).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(text);
};

for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["iphone14", { ...devices["iPhone 14"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}${BASE}/dev/editor/`);
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  check(await page.locator(".cm-content").count() === 1, `${name}: CodeMirror mounted`);
  check((await page.getByTestId("file-tree").textContent()).includes("helpers.py"), `${name}: file tree lists the starter files`);

  // Python: starter fails, then a correct solution passes (visible + hidden)
  await page.getByTestId("run").click();
  await page.getByTestId("py-results").waitFor({ timeout: 120_000 });
  check((await page.getByTestId("py-results").textContent()).includes("FAIL"), `${name}: starter fails the sample checks`);
  await page.screenshot({ path: join(shots, `editor-fail-${name}.png`), fullPage: true });

  // multi-file: open a second tab
  await page.getByTestId("file-helpers.py").click();
  check(await page.getByTestId("tab-helpers.py").count() === 1, `${name}: opening a file adds a tab`);
  await page.getByTestId("tab-main.py").click();

  // wrong gradient -> the gauge shows
  await setCode(page, "import numpy as np\nfrom player.helpers import clip_logits\n\ndef sigmoid(x):\n    return 1 / (1 + np.exp(-clip_logits(x)))\n\ndef sigmoid_grad(x):\n    return sigmoid(x)\n");
  await page.getByTestId("run").click();
  await page.getByTestId("py-results").waitFor({ timeout: 60_000 });
  await page.getByTestId("grad-gauge").waitFor({ timeout: 60_000 });
  check(true, `${name}: wrong derivative shows the gradient-check gauge`);

  await setCode(page, "import numpy as np\nfrom player.helpers import clip_logits\n\ndef sigmoid(x):\n    return 1 / (1 + np.exp(-clip_logits(x)))\n\ndef sigmoid_grad(x):\n    s = sigmoid(x)\n    return s * (1 - s)\n");
  await page.getByTestId("submit").click();
  await page.getByTestId("summary").waitFor({ timeout: 60_000 });
  const sum = await page.getByTestId("summary").textContent();
  check(sum.includes("3/3") && sum.includes("accepted"), `${name}: correct solution accepted (${sum})`);

  // draft persistence across reload
  await page.waitForTimeout(900);
  await page.reload();
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  check((await editor(page).textContent()).includes("clip_logits(x)))"), `${name}: draft restored after reload`);

  // new file validation
  await page.getByRole("button", { name: "+ New file" }).click();
  await page.getByTestId("new-file-input").fill("../evil.py");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  check(await page.getByRole("alert").count() > 0, `${name}: unsafe path is rejected`);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  // C++
  await page.getByRole("button", { name: "C++ task" }).click();
  await page.locator('[data-testid="workbench"][data-loaded="true"]').waitFor();
  await page.getByTestId("submit").click();
  await page.getByTestId("cpp-results").waitFor({ timeout: 180_000 });
  check((await page.getByTestId("overall").textContent()) !== "AC", `${name}: empty C++ main is rejected`);
  await setCode(page, "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n; cin >> n; vector<int> v(n);\n    for (auto& x : v) cin >> x;\n    sort(v.begin(), v.end());\n    for (int x : v) cout << x << ' ';\n    cout << '\\n';\n}\n");
  await page.getByTestId("submit").click();
  await page.getByText("hidden check 2").waitFor({ timeout: 60_000 });
  check((await page.getByTestId("overall").textContent()) === "AC", `${name}: correct C++ accepted with hidden checks masked`);
  await setCode(page, "int main() { return y; }\n");
  await page.getByTestId("run").click();
  await page.getByTestId("compile-error").waitFor({ timeout: 60_000 });
  check((await page.getByTestId("compile-error").textContent()).includes("undeclared identifier 'y'"), `${name}: compile error shown`);
  await page.screenshot({ path: join(shots, `editor-cpp-${name}.png`), fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${name}: no horizontal overflow (${overflow}px)`);
  check(errors.length === 0, `${name}: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
