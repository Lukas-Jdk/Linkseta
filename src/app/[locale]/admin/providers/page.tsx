// src/app/[locale]/admin/providers/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import ProvidersAdminClient from "./ProvidersAdminClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProvidersPage({ params }: Props) {
  const { locale } = await params;
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect(`/${locale}/login`);
  }

  if (authUser.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["USER", "ADMIN"],
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      profile: {
        select: {
          isApproved: true,
          lifetimeFree: true,
          lifetimeFreeGrantedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows = users.map((user) => ({
    userId: user.id,
    email: user.email,
    name: user.name,
    isApproved: Boolean(user.profile?.isApproved),
    lifetimeFree: Boolean(user.profile?.lifetimeFree),
    lifetimeFreeGrantedAt: user.profile?.lifetimeFreeGrantedAt
      ? user.profile.lifetimeFreeGrantedAt.toISOString()
      : null,
  }));

  return <ProvidersAdminClient rows={rows} />;
}