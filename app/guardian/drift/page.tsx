import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { DRIFT_BOSS } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Drift · Neural Clash" };

export default function Page() {
  return <Guardian def={DRIFT_BOSS} />;
}
