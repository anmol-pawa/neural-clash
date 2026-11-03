import type { Metadata } from "next";
import Train from "@/components/Train";

export const metadata: Metadata = { title: "Training Grounds · Neural Clash" };

export default function Page() {
  return <Train />;
}
