// src/app/[locale]/dashboard/services/new/page.tsx
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import NewServiceForm from "./NewServiceForm";
import styles from "./newService.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewServicePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className={styles.wrapper}>
      <div className={styles.shell}>
        <h1 className={styles.title}>Nauja paslauga</h1>
        <p className={styles.subtitle}>
          Užpildykite formą ir sukurkite savo paslaugos skelbimą. Vėliau galėsite jį redaguoti per savo paskyrą.
        </p>

        <div className={styles.card}>
          <NewServiceForm
            cities={cities.map((c) => ({ id: c.id, name: c.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>
    </main>
  );
}