// src/app/[locale]/dashboard/services/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { translateCategoryName } from "@/lib/categoryTranslations";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";

function pickLocalizedValue(
  locale: string,
  base: string,
  en?: string | null,
  no?: string | null,
) {
  if (locale === "en") return en?.trim() || base;
  if (locale === "no") return no?.trim() || base;
  return base;
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardServicesPage({ params }: Props) {
  const [{ locale }, authUser] = await Promise.all([params, getAuthUser()]);

  if (!authUser) {
    redirect(`/${locale}/login`);
  }

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "dashboardServicesPage",
  });

  const services = await prisma.serviceListing.findMany({
    where: {
      userId: authUser.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      titleEn: true,
      titleNo: true,
      isActive: true,
      city: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>{t("title")}</h1>

          <Link
            href={`/${locale}/dashboard/services/new`}
            className={styles.newButton}
          >
            + {t("newService")}
          </Link>
        </div>

        {services.length === 0 ? (
          <p className={styles.empty}>
            {t("emptyStart")}
            <strong> {t("emptyStrong")}</strong>.
          </p>
        ) : (
          <ul className={styles.list}>
            {services.map((s) => {
              const localizedTitle = pickLocalizedValue(
                locale,
                s.title,
                s.titleEn,
                s.titleNo,
              );

              return (
                <li key={s.id} className={styles.listItem}>
                  <div>
                    <div className={styles.serviceTitle}>{localizedTitle}</div>
                    <div className={styles.meta}>
                      {s.city?.name && <span>{s.city.name}</span>}
                      {(s.category?.name || s.category?.slug) && (
                        <span>
                          {" "}
                          ·{" "}
                          {translateCategoryName(
                            s.category?.slug,
                            s.category?.name,
                            locale,
                          )}
                        </span>
                      )}
                      <span>
                        {" "}
                        · {s.isActive ? t("statusActive") : t("statusInactive")}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Link
                      href={`/${locale}/services/${s.slug}`}
                      className={styles.linkButton}
                    >
                      {t("view")}
                    </Link>

                    <Link
                      href={`/${locale}/dashboard/services/${s.id}/edit`}
                      className={styles.linkButton}
                    >
                      {t("edit")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}