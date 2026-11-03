// Bundles the Training Grounds worker into public/train/worker.mjs (git-ignored), served same-origin.
import { build } from "esbuild";
import { join } from "node:path";

const root = process.cwd();
await build({ entryPoints: [join(root, "lib/train/train.worker.ts")], outfile: join(root, "public/train/worker.mjs"), bundle: true, format: "esm", target: "es2022", minify: true, logLevel: "warning" });
console.log("train worker staged in public/train");
