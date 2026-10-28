// Stages the in-browser C++ toolchain into public/clang/ (git-ignored): the @yowasp/clang wasm modules and
// resource tarball (~100 MB, from the npm package) plus the two worker bundles. Served same-origin, cached
// on first use by the service worker.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const pkgDir = join(root, "node_modules", "@yowasp", "clang");
const outDir = join(root, "public", "clang");
mkdirSync(outDir, { recursive: true });

const assets = readdirSync(join(pkgDir, "gen")).filter((f) => f.endsWith(".wasm") || f.endsWith(".tar"));
for (const f of assets) copyFileSync(join(pkgDir, "gen", f), join(outDir, f));
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
writeFileSync(join(outDir, "VERSION"), version);

const common = { bundle: true, format: "esm", target: "es2022", platform: "browser", minify: true, logLevel: "warning" };
// the toolchain package bundles its own node-only branch behind a runtime check; keep node builtins out of the browser bundle
await build({ ...common, entryPoints: [join(root, "lib/judge/clang.worker.ts")], outfile: join(outDir, "clang.worker.mjs"), external: ["node:*"] });
await build({ ...common, entryPoints: [join(root, "lib/judge/runner.worker.ts")], outfile: join(outDir, "runner.mjs") });
console.log(`clang ${version} staged in public/clang (${assets.join(", ")})`);
