// src/app/page.tsx

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import ServiceMarquee from "@/components/service-marquee/ServiceMarquee";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.linkseta.com"),
  title: "Paslaugos Norvegijoje – rask meistrus, valymą, remontą | Linkseta",
  description:
    "Rask patikimus paslaugų teikėjus Norvegijoje: meistrai, santechnikai, elektrikai, valymas, remontas, automobilių servisas ir daugiau. Greita paieška pagal miestą ir kategoriją.",
  keywords: [
    "paslaugos norvegijoje",
    "meistrai norvegijoje",
    "valymo paslaugos norvegijoje",
    "remontas norvegijoje",
    "santechnikas norvegija",
    "elektrikas norvegija",
    "automobiliu servisas norvegijoje",
    "paslaugu teikejai norvegijoje",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Paslaugos Norvegijoje – rask meistrus, valymą, remontą | Linkseta",
    description:
      "Linkseta padeda rasti paslaugų teikėjus Norvegijoje: remontas, valymas, statybos, auto servisas ir daugiau.",
    url: "https://www.linkseta.com/",
    siteName: "Linkseta",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Linkseta – paslaugos Norvegijoje",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paslaugos Norvegijoje – rask meistrus, valymą, remontą | Linkseta",
    description:
      "Rask paslaugų teikėjus Norvegijoje pagal miestą ir kategoriją. Greita paieška, aiškūs skelbimai.",
    images: ["/og.jpg"],
  },
  alternates: {
    canonical: "https://www.linkseta.com/",
  },
};

// ----------------------------------------

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type HomeProps = {
  searchParams: Promise<SearchParams>;
};

export default async function HomePage({ searchParams }: HomeProps) {
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

  if (city) {
    where.cityId = city;
  }

  if (category) {
    where.categoryId = category;
  }

  const services = await prisma.serviceListing.findMany({
    where,
    include: {
      city: true,
      category: true,
    },
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