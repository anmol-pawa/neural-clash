import type { Metadata } from "next";
import Labs from "@/components/Labs";

export const metadata: Metadata = { title: "Labs · Neural Clash" };

export default function Page() {
  return <Labs />;
}
