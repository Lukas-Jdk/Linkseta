/* src/app/page.tsx */

import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import { prisma } from "@/lib/prisma";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    category?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomeProps) {
  // Next.js 15 – awaitinam searchParams
  const resolved = await searchParams;

  const q = resolved.q ?? "";
  const city = resolved.city ?? "";
  const category = resolved.category ?? "";

  const where: any = { isActive: true };

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
    // 👇 PIRMA TOP, tada naujausi
    orderBy: [
      { highlighted: "desc" },
      { createdAt: "desc" },
    ],
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
    highlighted: s.highlighted, // 👈 pridėta
  }));

  return (
    <>
      <Hero>
        <div className="container">
          <SearchBar />
        </div>
      </Hero>

      <section className="container" style={{ padding: "40px 0 24px" }}>
        <CardGrid items={items} />
      </section>

      <section className="container" style={{ padding: "24px 0 80px" }}>
        <Features />
      </section>
    </>
  );
}
