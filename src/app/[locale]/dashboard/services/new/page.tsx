// src/app/[locale]/dashboard/services/new/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { setRequestLocale, getTranslations } from "next-intl/server";

import NewServiceForm from "./NewServiceForm";
import styles from "./newService.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewServicePage({ params }: Props) {
  const [{ locale }, user] = await Promise.all([params, getAuthUser()]);

  if (!user) redirect(`/${locale}/login`);

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "dashboardNewServicePage",
  });

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      orderBy: [{ postcode: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        postcode: true,
      },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>{t("title")}</h1>
            <p className={styles.pageSubtitle}>{t("subtitle")}</p>
          </div>
        </header>

        <div className={styles.formCard}>
          <NewServiceForm
            cities={cities.map((c) => ({
              id: c.id,
              name: c.name,
              postcode: c.postcode,
            }))}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
          />
        </div>
      </div>
    </main>
  );
}