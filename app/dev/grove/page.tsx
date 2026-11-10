import type { Metadata } from "next";
import GroveLab from "@/components/GroveLab";

export const metadata: Metadata = { title: "Classic Grove lab · dev" };

export default function Page() {
  return <GroveLab />;
}
