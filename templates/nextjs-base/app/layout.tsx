import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epoch Generated App",
  description: "Built by Epoch AI Agent Orchestrator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
