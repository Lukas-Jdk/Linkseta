/* src/app/page.tsx */

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import ServiceMarquee from "@/components/service-marquee/ServiceMarquee";


export const metadata: Metadata = {
  title:
    "Lietuvių paslaugos Norvegijoje – meistrai, remontas, valymas | Linkseta",
  description:
    "Rask patikimus lietuvių paslaugų teikėjus Norvegijoje: meistrai, santechnikai, elektrikai, valymo paslaugos, remontas, automobilių servisas ir daugiau. Greita paieška ir tik patikrinti teikėjai.",
  keywords: [
    "lietuviai norvegijoje",
    "paslaugos norvegijoje",
    "lietuviu meistrai norvegijoje",
    "lietuviai meistrai",
    "santechnikas norvegija",
    "elektrikas norvegija",
    "lietuviu paslaugos",
  ],
  openGraph: {
    title:
      "Lietuvių paslaugos Norvegijoje – meistrai, remontas, valymas | Linkseta",
    description:
      "Rask patikimus lietuvių paslaugų teikėjus Norvegijoje: meistrai, remontas, valymas, statybos, automobilių servisas.",
    url: "https://www.linkseta.com/",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title:
      "Lietuvių paslaugos Norvegijoje – meistrai, remontas, valymas | Linkseta",
    description:
      "Linkseta – vieta kur lietuviai Norvegijoje randa ir siūlo paslaugas.",
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
