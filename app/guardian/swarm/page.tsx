import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { SWARM_BOSS } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Imbalance Swarm · Neural Clash" };

export default function Page() {
  return <Guardian def={SWARM_BOSS} />;
}
