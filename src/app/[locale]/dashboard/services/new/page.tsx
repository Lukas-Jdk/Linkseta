// src/app/[locale]/dashboard/services/new/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { translateCategoryName } from "@/lib/categoryTranslations";

import NewServiceForm from "./NewServiceForm";
import styles from "./newService.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewServicePage({ params }: Props) {
  const [{ locale }, user] = await Promise.all([params, getAuthUser()]);

  if (!user) redirect(`/${locale}/login`);

  setRequestLocale(locale);

  const tPage = await getTranslations({
    locale,
    namespace: "dashboardNewServicePage",
  });

  const [cities, categories, profile, activeCount] = await Promise.all([
    prisma.city.findMany({
      orderBy: [{ postcode: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        postcode: true,
      },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        isApproved: true,
        trialEndsAt: true,
        plan: {
          select: {
            name: true,
            slug: true,
            maxListings: true,
            maxImagesPerListing: true,
            isTrial: true,
          },
        },
      },
    }),
    prisma.serviceListing.count({
      where: {
        userId: user.id,
        isActive: true,
        deletedAt: null,
      },
    }),
  ]);

  if (!profile?.isApproved) {
    redirect(`/${locale}/tapti-teikeju`);
  }

  const trialExpired = Boolean(
    profile.plan?.isTrial &&
      profile.trialEndsAt &&
      new Date(profile.trialEndsAt).getTime() < Date.now(),
  );

  const planName = profile.plan?.name ?? "Free Trial";

  const maxListings =
    typeof profile.plan?.maxListings === "number"
      ? profile.plan.maxListings
      : 1;

  const maxImagesPerListing =
    typeof profile.plan?.maxImagesPerListing === "number"
      ? profile.plan.maxImagesPerListing
      : 5;

  const canCreate = !trialExpired && activeCount < maxListings;

  const localizedCategories = categories.map((c) => ({
    id: c.id,
    name: translateCategoryName(c.slug, c.name, locale),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>{tPage("title")}</h1>
            <p className={styles.pageSubtitle}>{tPage("subtitle")}</p>
          </div>
        </header>

        <div className={styles.formCard}>
          <NewServiceForm
            cities={cities.map((c) => ({
              id: c.id,
              name: c.name,
              postcode: c.postcode,
            }))}
            categories={localizedCategories}
            planLimits={{
              planName,
              maxListings,
              maxImagesPerListing,
              activeCount,
              canCreate,
              trialExpired,
            }}
          />
        </div>
      </div>
    </main>
  );
}