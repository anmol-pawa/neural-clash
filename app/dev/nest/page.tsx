import type { Metadata } from "next";
import NestLab from "@/components/NestLab";

export const metadata: Metadata = { title: "Neuron Nest lab · dev" };

export default function Page() {
  return <NestLab />;
}
