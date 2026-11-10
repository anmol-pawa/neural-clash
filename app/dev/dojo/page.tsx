import type { Metadata } from "next";
import DataDojoLab from "@/components/DataDojoLab";

export const metadata: Metadata = { title: "Data Dojo lab · dev" };

export default function Page() {
  return <DataDojoLab />;
}
