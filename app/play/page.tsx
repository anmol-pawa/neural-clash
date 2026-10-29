import type { Metadata } from "next";
import Overworld from "@/components/Overworld";

export const metadata: Metadata = { title: "Play · Neural Clash" };

export default function Page() {
  return <Overworld />;
}
