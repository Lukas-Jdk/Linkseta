// src/app/[locale]/register/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registracija – Linkseta",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
