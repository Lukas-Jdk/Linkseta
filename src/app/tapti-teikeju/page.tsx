// src/app/tapti-teikeju/page.tsx

import { prisma } from "@/lib/prisma";
import ProviderRequestForm from "@/components/provider/ProviderRequestForm";

export default async function BecomeProviderPage() {
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const cityOptions = cities.map((c) => ({ id: c.id, name: c.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <main style={{ padding: "40px 0" }}>
      <div className="container">
        <h1 style={{ marginBottom: "16px" }}>Tapk paslaugų teikėju</h1>
        <p style={{ marginBottom: "24px", maxWidth: 640 }}>
          Užpildykite formą ir mes peržiūrėsime jūsų paraišką. Jei viskas bus
          gerai, susisieksime ir padėsime įkelti jūsų paslaugas į Linkseta.
        </p>

        <ProviderRequestForm
          cities={cityOptions}
          categories={categoryOptions}
        />
      </div>
    </main>
  );
}
