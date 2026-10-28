import type { Metadata } from "next";
import EditorLab from "@/components/EditorLab";

export const metadata: Metadata = { title: "Code editor · dev" };

export default function Page() {
  return <EditorLab />;
}
