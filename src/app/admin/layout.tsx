// src/app/admin/layout.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin – Linkseta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  // neprisijungęs -> į login
  if (!user) {
    redirect("/login");
  }

  // ne admin -> į dashboard (arba į /)
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
