import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Lets phones install Neural Clash to the home screen as a full-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neural Clash — build the network, raise the companion",
    short_name: "Neural Clash",
    description: "A creature RPG where your companion is a neural network you implement and train.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0820",
    theme_color: "#0a0820",
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
