/* src/app/page.tsx */

import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
// import Filters from "@/components/filters/Filters"; // kol kas nenaudojam
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  // paimam paskutines 6 aktyvias paslaugas
  const services = await prisma.serviceListing.findMany({
    where: { isActive: true },
    include: {
      city: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
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
  }));

  return (
    <>
      <Hero>
        <div className="container">
          <SearchBar />
          {/* <Filters /> */}
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