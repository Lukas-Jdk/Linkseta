
// src/app/[locale]/dashboard/services/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import EditServiceForm from "./EditServiceForm";
import styles from "./edit.module.css";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: PageProps) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const { id } = await params;

  const service = await prisma.serviceListing.findUnique({
    where: { id },
    include: { city: true, category: true },
  });

  if (!service) redirect("/dashboard/services");

  if (service.userId !== authUser.id) {
    redirect("/dashboard/services");
  }

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial = {
  id: service.id,
  title: service.title,
  description: service.description ?? "",
  cityId: service.cityId ?? "",
  categoryId: service.categoryId ?? "",
  priceFrom: service.priceFrom ?? null,
  imageUrl: service.imageUrl ?? null,
  imagePath: service.imagePath ?? null, 
  highlights: Array.isArray(service.highlights) ? service.highlights : [],
  isActive: service.isActive, 
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