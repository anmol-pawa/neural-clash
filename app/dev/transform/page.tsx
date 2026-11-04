import type { Metadata } from "next";
import TransformLab from "@/components/TransformLab";

export const metadata: Metadata = { title: "Transform lab · dev" };

export default function Page() {
  return <TransformLab />;
}
