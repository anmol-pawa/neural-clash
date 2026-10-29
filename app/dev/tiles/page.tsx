import type { Metadata } from "next";
import TileLab from "@/components/TileLab";

export const metadata: Metadata = { title: "Tiles · dev" };

export default function Page() {
  return <TileLab />;
}
