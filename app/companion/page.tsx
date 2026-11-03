import type { Metadata } from "next";
import Companion from "@/components/Companion";

export const metadata: Metadata = { title: "Your Neuron-Pup · Neural Clash" };

export default function Page() {
  return <Companion />;
}
