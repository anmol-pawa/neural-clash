import type { Metadata } from "next";
import PyodideLab from "@/components/PyodideLab";

export const metadata: Metadata = { title: "Pyodide runtime · dev" };

export default function Page() {
  return <PyodideLab />;
}
