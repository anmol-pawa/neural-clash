import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { VALE_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Warden Basis · Neural Clash" };

export default function Page() {
  return <Guardian def={VALE_GUARDIAN} />;
}
