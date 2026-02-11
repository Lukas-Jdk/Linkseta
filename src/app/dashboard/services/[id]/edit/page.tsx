// src/app/dashboard/services/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import EditServiceForm from "./EditServiceForm";
import styles from "./edit.module.css";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;

  const [service, cities, categories] = await Promise.all([
    prisma.serviceListing.findUnique({
      where: { id },
      include: { city: true, category: true },
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!service) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.card}>
            <h1 className={styles.pageTitle}>Paslauga nerasta</h1>
            <p className={styles.pageSubtitle}>Tokios paslaugos sistemoje nebėra.</p>
          </div>
        </div>
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
    imageUrl: service.imageUrl ?? null,
    highlights: service.highlights ?? [],
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Redaguoti paslaugą</h1>
            <p className={styles.pageSubtitle}>
              Atnaujinkite paslaugos informaciją arba ištrinkite skelbimą.
            </p>
          </div>
        </header>

        <div className={styles.formCard}>
          <EditServiceForm
            initial={initial}
            cities={cities.map((c) => ({ id: c.id, name: c.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>
    </main>
  );
}
