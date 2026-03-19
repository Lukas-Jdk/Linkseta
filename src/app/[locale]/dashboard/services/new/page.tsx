// src/app/[locale]/dashboard/services/new/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { translateCategoryName } from "@/lib/categoryTranslations";
import NewServiceForm from "./NewServiceForm";
import styles from "./newService.module.css";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewServicePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "dashboardNewServicePage",
  });

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>

        <div className={styles.card}>
          <NewServiceForm
            cities={cities.map((c) => ({ id: c.id, name: c.name }))}
            categories={categories.map((c) => ({
              id: c.id,
              name: translateCategoryName(c.slug, c.name, locale),
              slug: c.slug,
            }))}
          />
        </div>
      </div>
    </main>
  );
}