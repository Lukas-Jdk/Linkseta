// src/app/[locale]/page.tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import ServiceMarquee from "@/components/service-marquee/ServiceMarquee";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.linkseta.com";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });

  const canonical = `${siteUrl}/${locale}`;

  return {
    title: t("homeTitle"),
    description: t("homeDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt`,
        en: `${siteUrl}/en`,
        no: `${siteUrl}/no`,
      },
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [
        {
          url: "/og.png",
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
      images: ["/og.png"],
    },
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolved = await searchParams;

  const q = resolved.q ?? "";
  const city = resolved.city ?? "";
  const category = resolved.category ?? "";

  const where: Prisma.ServiceListingWhereInput = {
    isActive: true,
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (city) where.cityId = city;
  if (category) where.categoryId = category;

  const services = await prisma.serviceListing.findMany({
    where,
    include: { city: true, category: true },
    orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

  const items = services.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    city: s.city?.name ?? "",
    category: s.category?.name ?? "",
    priceFrom: s.priceFrom,
    slug: s.slug,
    highlighted: s.highlighted ?? false,
    imageUrl: s.imageUrl,
  }));

  return (
    <>
      <ServiceMarquee />
      <Hero>
        <div className="container">
          <SearchBar />
        </div>
      </Hero>

      <section className="container" style={{ padding: "40px 0 24px" }}>
        <CardGrid items={items} />
      </section>

      <Features />
    </>
  );
}
