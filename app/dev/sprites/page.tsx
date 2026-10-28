import type { Metadata } from "next";
import SpriteLab from "@/components/SpriteLab";

export const metadata: Metadata = { title: "Sprites · dev" };

export default function Page() {
  return <SpriteLab />;
}
