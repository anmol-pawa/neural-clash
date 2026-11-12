import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { CAVERNS_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Scanwarden · Neural Clash" };

export default function Page() {
  return <Guardian def={CAVERNS_GUARDIAN} />;
}
