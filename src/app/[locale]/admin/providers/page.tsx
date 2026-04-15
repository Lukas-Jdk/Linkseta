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

  const [users, plans] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: {
          in: ["USER", "ADMIN"],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        profile: {
          select: {
            isApproved: true,
            lifetimeFree: true,
            lifetimeFreeGrantedAt: true,
            plan: {
              select: {
                id: true,
                slug: true,
                name: true,
                priceNok: true,
                period: true,
                highlight: true,
                isTrial: true,
              },
            },
          },
        },
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.plan.findMany({
      orderBy: [{ priceNok: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        priceNok: true,
        period: true,
        highlight: true,
        isTrial: true,
      },
    }),
  ]);

  const rows = users.map((user) => ({
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    servicesCount: user._count.services,
    isApproved: Boolean(user.profile?.isApproved),
    lifetimeFree: Boolean(user.profile?.lifetimeFree),
    lifetimeFreeGrantedAt: user.profile?.lifetimeFreeGrantedAt
      ? user.profile.lifetimeFreeGrantedAt.toISOString()
      : null,
    currentPlan: user.profile?.plan
      ? {
          id: user.profile.plan.id,
          slug: user.profile.plan.slug,
          name: user.profile.plan.name,
          priceNok: user.profile.plan.priceNok,
          period: user.profile.plan.period,
          highlight: user.profile.plan.highlight,
          isTrial: user.profile.plan.isTrial,
        }
      : null,
  }));

  const safePlans = plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    priceNok: plan.priceNok,
    period: plan.period,
    highlight: plan.highlight,
    isTrial: plan.isTrial,
  }));

  return <ProvidersAdminClient rows={rows} plans={safePlans} />;
}