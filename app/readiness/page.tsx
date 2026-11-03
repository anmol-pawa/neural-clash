import type { Metadata } from "next";
import Readiness from "@/components/Readiness";

export const metadata: Metadata = { title: "Readiness Report · Neural Clash" };

export default function Page() {
  return <Readiness />;
}
