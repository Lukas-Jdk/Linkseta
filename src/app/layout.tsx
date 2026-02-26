// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Linkseta",
  description: "Linkseta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}