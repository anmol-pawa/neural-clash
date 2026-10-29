import type { Metadata } from "next";
import Battle from "@/components/Battle";

export const metadata: Metadata = { title: "Card battle · Neural Clash" };

export default function Page() {
  return <Battle />;
}
