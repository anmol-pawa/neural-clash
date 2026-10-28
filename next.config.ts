import type { NextConfig } from "next";
import path from "node:path";

/**
 * Two build modes:
 *  - default (`npm run build`): a normal Next.js app for `next start`.
 *  - static (`npm run build:pages`): STATIC_EXPORT=1 writes plain files to out/
 *    for GitHub Pages. BASE_PATH sets the sub-path the site is served from
 *    (e.g. "/neural-clash").
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(".") },
  outputFileTracingRoot: path.resolve("."),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_PWA: staticExport ? "1" : "" },
  ...(staticExport
    ? {
        output: "export",
        basePath: basePath || undefined,
        // /lab/ → lab/index.html, which every static host serves
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
