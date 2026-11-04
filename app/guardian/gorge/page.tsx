import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { GORGE_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Warden Chain · Neural Clash" };

export default function Page() {
  return <Guardian def={GORGE_GUARDIAN} />;
}
