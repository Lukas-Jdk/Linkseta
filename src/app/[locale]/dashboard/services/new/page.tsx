// src/app/[locale]/dashboard/services/new/page.tsx
import { setRequestLocale } from "next-intl/server";
import type { Prisma } from "@prisma/client";
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

  // ✅ užkraunam filtrus server-side (greita + patikima)
  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" as Prisma.CategoryWhereInput["type"] },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Nauja paslauga</h1>
          <p className={styles.subtitle}>
            Užpildykite formą ir sukurkite savo paslaugos skelbimą. Vėliau galėsite jį redaguoti per savo paskyrą.
          </p>
        </header>

        {/* ✅ DABAR props yra legalūs, nes forma juos priima */}
        <NewServiceForm cities={cities} categories={categories} locale={locale} />
      </div>
    </main>
  );
}