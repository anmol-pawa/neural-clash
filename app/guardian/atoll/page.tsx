import type { Metadata } from "next";
import Guardian from "@/components/Guardian";
import { ATOLL_GUARDIAN } from "@/lib/guardian/defs";

export const metadata: Metadata = { title: "Heedray · Neural Clash" };

export default function Page() {
  return <Guardian def={ATOLL_GUARDIAN} />;
}
