// src/app/[locale]/page.tsx

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { siteUrl } from "@/lib/seo";
import { localeAlternates, absOg } from "@/lib/seo-i18n";

import Hero from "@/components/hero/Hero";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import ServiceMarquee from "@/components/service-marquee/ServiceMarquee";
import SearchBarLazy from "@/components/search/SearchBarLazy";

export const revalidate = 60;

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const HOMEPAGE_LIMIT = 6;
const ROTATION_WINDOW_HOURS = 6;

function cleanParam(value?: string) {
  return value?.trim() ?? "";
}

function pickLocalizedValue(
  locale: string,
  base: string,
  en?: string | null,
  no?: string | null,
) {
  if (locale === "en") return en?.trim() || base;
  if (locale === "no") return no?.trim() || base;
  return base;
}

function formatLocationCity(args: {
  locationCity?: string | null;
  fallbackCity?: string | null;
}) {
  return args.locationCity?.trim() || args.fallbackCity?.trim() || "";
}

function rotateIds(ids: string[], offset: number) {
  if (ids.length === 0) return [];
  const normalizedOffset = ((offset % ids.length) + ids.length) % ids.length;
  return [...ids.slice(normalizedOffset), ...ids.slice(0, normalizedOffset)];
}

function sortByIdOrder<T extends { id: string }>(items: T[], orderedIds: string[]) {
  const order = new Map(orderedIds.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    return (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999);
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });

  const canonical = `${siteUrl}/${locale}`;

  return {
    title: t("homeTitle"),
    description: t("homeDesc"),
    alternates: localeAlternates(""),
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [
        {
          url: absOg("/og-v2.png"),
          width: 1200,
          height: 630,
          alt: "Linkseta",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDesc"),
      images: [absOg("/og-v2.png")],
    },
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const [{ locale }, resolved] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const tCategories = await getTranslations({
    locale,
    namespace: "categories",
  });

  const q = cleanParam(resolved.q);
  const city = cleanParam(resolved.city);
  const category = cleanParam(resolved.category);

  const baseWhere: Prisma.ServiceListingWhereInput = {
    isActive: true,
    deletedAt: null,
  };

  if (q) {
    baseWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
      { descriptionEn: { contains: q, mode: "insensitive" } },
      { titleNo: { contains: q, mode: "insensitive" } },
      { descriptionNo: { contains: q, mode: "insensitive" } },
    ];
  }

  if (city) baseWhere.cityId = city;
  if (category) baseWhere.categoryId = category;

  // SVARBU:
  // homepage entitlement tikrinam pagal dabartinį provider profile planą,
  // o ne pagal serviceListing.planId snapshot.
  const premiumHomepageIds = await prisma.serviceListing.findMany({
    where: {
      ...baseWhere,
      user: {
        profile: {
          isApproved: true,
          plan: {
            slug: "premium",
            canAppearOnHomepage: true,
          },
        },
      },
    },
    select: {
      id: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  let selectedIds = premiumHomepageIds.map((x) => x.id);

  if (selectedIds.length > 0) {
    const rotationIndex =
      Math.floor(Date.now() / (ROTATION_WINDOW_HOURS * 60 * 60 * 1000)) %
      selectedIds.length;

    selectedIds = rotateIds(selectedIds, rotationIndex).slice(0, HOMEPAGE_LIMIT);
  }

  const services =
    selectedIds.length > 0
      ? sortByIdOrder(
          await prisma.serviceListing.findMany({
            where: {
              id: { in: selectedIds },
              isActive: true,
              deletedAt: null,
              user: {
                profile: {
                  isApproved: true,
                  plan: {
                    slug: "premium",
                    canAppearOnHomepage: true,
                  },
                },
              },
            },
            select: {
              id: true,
              title: true,
              titleEn: true,
              titleNo: true,
              description: true,
              descriptionEn: true,
              descriptionNo: true,
              priceFrom: true,
              priceTo: true,
              slug: true,
              highlighted: true,
              imageUrl: true,
              locationPostcode: true,
              locationCity: true,
              locationRegion: true,
              city: {
                select: {
                  name: true,
                },
              },
              category: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          }),
          selectedIds,
        )
      : [];

  const items = services.map((s) => {
    const localizedTitle = pickLocalizedValue(
      locale,
      s.title,
      s.titleEn,
      s.titleNo,
    );

    const localizedDescription = pickLocalizedValue(
      locale,
      s.description,
      s.descriptionEn,
      s.descriptionNo,
    );

    let localizedCategory = s.category?.name ?? "";

    if (s.category?.slug) {
      try {
        localizedCategory = tCategories(s.category.slug);
      } catch {
        localizedCategory = s.category.name ?? s.category.slug;
      }
    }

    return {
      id: s.id,
      title: localizedTitle,
      description: localizedDescription,
      city: formatLocationCity({
        locationCity: s.locationCity,
        fallbackCity: s.city?.name,
      }),
      category: localizedCategory,
      priceFrom: s.priceFrom,
      priceTo: s.priceTo,
      slug: s.slug,
      highlighted: s.highlighted ?? false,
      imageUrl: s.imageUrl,
      locationPostcode: s.locationPostcode ?? "",
      locationCity: s.locationCity ?? s.city?.name ?? "",
      locationRegion: s.locationRegion ?? "",
    };
  });

  return (
    <>
      <ServiceMarquee />

      <Hero>
        <div className="container">
          <SearchBarLazy />
        </div>
      </Hero>

      <section className="container" style={{ padding: "40px 0 24px" }}>
        <CardGrid items={items} locale={locale} />
      </section>

      <Features />
    </>
  );
}