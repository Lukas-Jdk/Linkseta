// src/app/dashboard/services/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import EditServiceForm from "./EditServiceForm";
import styles from "@/app/dashboard/services/services.module.css";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;

  const [service, cities, categories] = await Promise.all([
    prisma.serviceListing.findUnique({
      where: { id },
      include: {
        city: true,
        category: true,
      },
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!service) {
    return (
      <main className={styles.container}>
        <h1 className={styles.pageTitle}>Paslauga nerasta</h1>
        <p>Tokios paslaugos sistemoje nebėra.</p>
      </main>
    );
  }

  const initial = {
    id: service.id,
    title: service.title,
    description: service.description ?? "",
    cityId: service.cityId ?? "",
    categoryId: service.categoryId ?? "",
    priceFrom: service.priceFrom ?? null,
    imageUrl: service.imageUrl ?? null, // 👈 ŠITO TRŪKO
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>Redaguoti paslaugą</h1>
      <p className={styles.pageSubtitle}>
        Čia gali atnaujinti savo paslaugos informaciją arba ją ištrinti.
      </p>

      <EditServiceForm
        initial={initial}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  );
}
