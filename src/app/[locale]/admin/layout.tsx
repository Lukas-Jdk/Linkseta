//  src/app/[locale]/admin/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin – Linkseta",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}