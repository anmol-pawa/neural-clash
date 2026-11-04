import type { Metadata } from "next";
import DescentLab from "@/components/DescentLab";

export const metadata: Metadata = { title: "Descent lab · dev" };

export default function Page() {
  return <DescentLab />;
}
