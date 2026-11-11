import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { LEAKAGE_BOSS } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Leakage · Neural Clash" };

export default function Page() {
  return <Guardian def={LEAKAGE_BOSS} />;
}
