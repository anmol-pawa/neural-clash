// Stages the Pyodide runtime and its worker bundle into public/pyodide/ (git-ignored) so it is served
// same-origin and cached for offline play. The core files come from the `pyodide`
// npm package; the numpy wheel is not in that package, so it is extracted once from
// the official release tarball into .cache/ (checked against pyodide-lock.json).
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const pkgDir = join(root, "node_modules", "pyodide");
const outDir = join(root, "public", "pyodide");
const cacheDir = join(root, ".cache", "pyodide-extra");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(pkgDir, "pyodide-lock.json"), "utf8"));
const WHEELS = ["numpy"]; // add more packages here (their depends must be listed too)

const core = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });
for (const f of core) copyFileSync(join(pkgDir, f), join(outDir, f));

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const missing = WHEELS.map((n) => lock.packages[n]).filter((p) => !existsSync(join(cacheDir, p.file_name)) || sha(join(cacheDir, p.file_name)) !== p.sha256);

if (missing.length) {
  const tar = join(cacheDir, "release.tar.bz2");
  const url = `https://github.com/pyodide/pyodide/releases/download/${version}/pyodide-${version}.tar.bz2`;
  console.log(`fetching ${url} (one-off, ~340 MB) to extract ${missing.map((p) => p.file_name).join(", ")}`);
  execFileSync("curl", ["-fsSL", "--retry", "3", "-o", tar, url], { stdio: "inherit" });
  execFileSync("tar", ["xjf", tar, "-C", cacheDir, "--strip-components=1", ...missing.map((p) => `pyodide/${p.file_name}`)], { stdio: "inherit" });
  rmSync(tar);
}
for (const p of WHEELS.map((n) => lock.packages[n])) {
  if (sha(join(cacheDir, p.file_name)) !== p.sha256) throw new Error(`checksum mismatch for ${p.file_name}`);
  copyFileSync(join(cacheDir, p.file_name), join(outDir, p.file_name));
}
writeFileSync(join(outDir, "VERSION"), version);
await build({ entryPoints: [join(root, "lib/py/pyodide.worker.ts")], outfile: join(outDir, "worker.mjs"), bundle: true, format: "esm", target: "es2022", minify: true, logLevel: "warning" });
console.log(`pyodide ${version} staged in public/pyodide (${WHEELS.join(", ")})`);
