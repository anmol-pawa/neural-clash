import type { Metadata } from "next";
import CardBattle from "@/components/CardBattle";

export const metadata: Metadata = { title: "Card battle · Neural Clash" };

export default function Page() {
  return <CardBattle />;
}
