import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Dojo from "@/components/Dojo";
import { dojoProblem, dojoProblems } from "@/lib/dojo/catalog";

export const dynamicParams = false;
export const generateStaticParams = () => dojoProblems().map((p) => ({ id: p.id }));
export const metadata: Metadata = { title: "Code Dojo · Neural Clash" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dojoProblem(id)) notFound();
  return <Dojo id={id} />;
}
