import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { RAPIDS_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Loopwyrm · Neural Clash" };

export default function Page() {
  return <Guardian def={RAPIDS_GUARDIAN} />;
}
