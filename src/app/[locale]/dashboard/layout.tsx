// src/app/[locale]/dashboard/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mano paskyra – Linkseta",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
