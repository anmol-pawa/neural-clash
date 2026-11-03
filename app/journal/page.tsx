import type { Metadata } from "next";
import Journal from "@/components/Journal";

export const metadata: Metadata = { title: "Research Journal · Neural Clash" };

export default function Page() {
  return <Journal />;
}
