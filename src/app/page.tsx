/* src/app/page.tsx */

import Hero from "@/components/hero/Hero";
import SearchBar from "@/components/search/SearchBar";
import Filters from "@/components/filters/Filters";
import Features from "@/components/features/Features";
import CardGrid from "@/components/cards/CardGrid";

export default function HomePage() {
  return (
    <>
      <Hero>
        <div className="container">
          <SearchBar />
          {/* <Filters />  // kol kas nenaudojam, vėliau pritaikysim */}
        </div>
      </Hero>

      <section className="container" style={{ padding: "40px 0 24px" }}>
        <CardGrid items={[]} />
      </section>

      <section className="container" style={{ padding: "24px 0 80px" }}>
        <Features />
      </section>
    </>
  );
}
