// src/app/[locale]/dashboard/services/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import EditServiceForm from "./EditServiceForm";
import styles from "./edit.module.css";

type PageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: PageProps) {
  const [{ id, locale }, authUser] = await Promise.all([params, getAuthUser()]);

  if (!authUser) redirect(`/${locale}/login`);

  const service = await prisma.serviceListing.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      cityId: true,
      categoryId: true,
      priceFrom: true,
      imageUrl: true,
      imagePath: true,
      galleryImageUrls: true,
      galleryImagePaths: true,
      highlights: true,
      isActive: true,
      priceItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          label: true,
          priceFrom: true,
          priceTo: true,
          note: true,
        },
      },
    },
  });

  if (!service) redirect(`/${locale}/dashboard/services`);

  if (service.userId !== authUser.id) {
    redirect(`/${locale}/dashboard/services`);
  }

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
    galleryImageUrls:
      Array.isArray(service.galleryImageUrls) &&
      service.galleryImageUrls.length > 0
        ? service.galleryImageUrls
        : service.imageUrl
          ? [service.imageUrl]
          : [],
    galleryImagePaths:
      Array.isArray(service.galleryImagePaths) &&
      service.galleryImagePaths.length > 0
        ? service.galleryImagePaths
        : service.imagePath
          ? [service.imagePath]
          : [],
    highlights: Array.isArray(service.highlights) ? service.highlights : [],
    isActive: service.isActive,
    priceItems: Array.isArray(service.priceItems)
      ? service.priceItems.map((item) => ({
          title: item.label ?? "",
          price:
            item.priceFrom != null && item.priceTo != null
              ? `${item.priceFrom}-${item.priceTo} NOK`
              : item.priceFrom != null
                ? `nuo ${item.priceFrom} NOK`
                : item.priceTo != null
                  ? `iki ${item.priceTo} NOK`
                  : "",
          note: item.note ?? "",
        }))
      : [],
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Redaguoti paslaugą</h1>
            <p className={styles.pageSubtitle}>
              Atnaujinkite paslaugos informaciją, galeriją, kainas arba
              ištrinkite skelbimą.
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