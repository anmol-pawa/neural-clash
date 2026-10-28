import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { inter, jetbrains, pixel } from "./fonts";

export const metadata: Metadata = {
  title: "Neural Clash — build the network, raise the companion",
  description: "A creature RPG where your companion is a neural network you implement from scratch in Python and train, from perceptrons to transformers and the full AI-engineer interview loop.",
  appleWebApp: { capable: true, title: "Neural Clash", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0820",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${pixel.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
