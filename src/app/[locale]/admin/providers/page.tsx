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
            trialEndsAt: true,
            plan: {
              select: {
                id: true,
                slug: true,
                name: true,
                priceNok: true,
                period: true,
                highlight: true,
                isTrial: true,
                trialDays: true,
                maxListings: true,
                maxImagesPerListing: true,
                canAppearOnHomepage: true,
                canBecomeTop: true,
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
      where: {
        slug: {
          in: ["free-trial", "basic", "premium"],
        },
      },
      orderBy: [{ priceNok: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        priceNok: true,
        period: true,
        highlight: true,
        isTrial: true,
        trialDays: true,
        maxListings: true,
        maxImagesPerListing: true,
        canAppearOnHomepage: true,
        canBecomeTop: true,
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
    trialEndsAt: user.profile?.trialEndsAt
      ? user.profile.trialEndsAt.toISOString()
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
          trialDays: user.profile.plan.trialDays,
          maxListings: user.profile.plan.maxListings,
          maxImagesPerListing: user.profile.plan.maxImagesPerListing,
          canAppearOnHomepage: user.profile.plan.canAppearOnHomepage,
          canBecomeTop: user.profile.plan.canBecomeTop,
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
    trialDays: plan.trialDays,
    maxListings: plan.maxListings,
    maxImagesPerListing: plan.maxImagesPerListing,
    canAppearOnHomepage: plan.canAppearOnHomepage,
    canBecomeTop: plan.canBecomeTop,
  }));

  return (
    <ProvidersAdminClient
      locale={locale}
      rows={rows}
      plans={safePlans}
    />
  );
}