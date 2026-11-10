import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { GROVE_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Warden Split · Neural Clash" };

export default function Page() {
  return <Guardian def={GROVE_GUARDIAN} />;
}
