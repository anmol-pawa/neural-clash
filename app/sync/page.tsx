import type { Metadata } from "next";
import Sync from "@/components/Sync";

export const metadata: Metadata = { title: "Daily Sync · Neural Clash" };

export default function Page() {
  return <Sync />;
}
