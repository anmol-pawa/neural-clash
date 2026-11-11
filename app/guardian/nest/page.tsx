import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { NEST_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Dimwarden · Neural Clash" };

export default function Page() {
  return <Guardian def={NEST_GUARDIAN} />;
}
