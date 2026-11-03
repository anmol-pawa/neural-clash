import type { Metadata } from "next";
import Guardian from "@/components/Guardian";

export const metadata: Metadata = { title: "Warden Indent · Neural Clash" };

export default function Page() {
  return <Guardian />;
}
