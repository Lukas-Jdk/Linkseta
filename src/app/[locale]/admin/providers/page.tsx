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

            stripeCustomerId: true,
            stripeSubscriptionId: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,

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

  const rows = users.map((user) => {
    const profile = user.profile;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      servicesCount: user._count.services,

      isApproved: Boolean(profile?.isApproved),

      lifetimeFree: Boolean(profile?.lifetimeFree),
      lifetimeFreeGrantedAt: profile?.lifetimeFreeGrantedAt
        ? profile.lifetimeFreeGrantedAt.toISOString()
        : null,

      trialEndsAt: profile?.trialEndsAt
        ? profile.trialEndsAt.toISOString()
        : null,

      stripeCustomerId: profile?.stripeCustomerId ?? null,
      stripeSubscriptionId: profile?.stripeSubscriptionId ?? null,
      subscriptionStatus: profile?.subscriptionStatus ?? null,
      currentPeriodEnd: profile?.currentPeriodEnd
        ? profile.currentPeriodEnd.toISOString()
        : null,

      currentPlan: profile?.plan
        ? {
            id: profile.plan.id,
            slug: profile.plan.slug,
            name: profile.plan.name,
            priceNok: profile.plan.priceNok,
            period: profile.plan.period,
            highlight: profile.plan.highlight,
            isTrial: profile.plan.isTrial,
            trialDays: profile.plan.trialDays,
            maxListings: profile.plan.maxListings,
            maxImagesPerListing: profile.plan.maxImagesPerListing,
            canAppearOnHomepage: profile.plan.canAppearOnHomepage,
            canBecomeTop: profile.plan.canBecomeTop,
          }
        : null,
    };
  });

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
    <ProvidersAdminClient locale={locale} rows={rows} plans={safePlans} />
  );
}