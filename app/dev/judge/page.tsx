import type { Metadata } from "next";
import JudgeLab from "@/components/JudgeLab";

export const metadata: Metadata = { title: "C++ judge · dev" };

export default function Page() {
  return <JudgeLab />;
}
