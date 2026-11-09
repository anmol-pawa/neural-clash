import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { PEAKS_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Warden Bell · Neural Clash" };

export default function Page() {
  return <Guardian def={PEAKS_GUARDIAN} />;
}
