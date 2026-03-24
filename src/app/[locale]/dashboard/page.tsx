// src/app/[locale]/dashboard/page.tsx
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { translateCategoryName } from "@/lib/categoryTranslations";
import styles from "./dashboard.module.css";
import ProfileCardClient from "./ProfileCardClient";
import { MapPin, Folder, Calendar, Eye, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateByLocale(date: Date, locale: string) {
  const map: Record<string, string> = {
    lt: "lt-LT",
    en: "en-GB",
    no: "nb-NO",
  };

  return new Intl.DateTimeFormat(map[locale] ?? "lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const [{ locale }, authUser] = await Promise.all([params, getAuthUser()]);

  if (!authUser) redirect(`/${locale}/login`);

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "dashboardPage",
  });

  const [profile, services] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: authUser.id },
      select: { isApproved: true },
    }),
    prisma.serviceListing.findMany({
      where: {
        userId: authUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        isActive: true,
        highlighted: true,
        imageUrl: true,
        city: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isProviderApproved = Boolean(profile?.isApproved);

  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;

  return (
    <main className={styles.page}>
      <div className="container">
        <section className={styles.topCard}>
          <div className={styles.topCardLeft}>
            <h1 className={styles.h1}>{t("title")}</h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>

          <div className={styles.topCardRight}>
            {isProviderApproved && (
              <Link
                href={`/${locale}/dashboard/services/new`}
                className={styles.newBtn}
              >
                <span className={styles.plus}>＋</span>
                {t("newService")}
              </Link>
            )}
          </div>
        </section>

        <div className={styles.grid}>
          <ProfileCardClient
            name={authUser.name ?? null}
            email={authUser.email}
            role={authUser.role}
            avatarUrl={authUser.avatarUrl ?? null}
            totalServices={totalServices}
            isProviderApproved={isProviderApproved}
          />

          <section className={styles.servicesCard}>
            <div className={styles.servicesHeader}>
              <div>
                <h2 className={styles.h2}>{t("myServices")}</h2>
              </div>
              <div className={styles.servicesCount}>
                {activeServices} {t("active")}
              </div>
            </div>

            <div className={styles.servicesList}>
              {isProviderApproved && services.length === 0 && (
                <div className={styles.empty}>
                  {t("emptyApproved")}
                  <div className={styles.emptyActions}>
                    <Link
                      href={`/${locale}/dashboard/services/new`}
                      className={styles.newBtnSmall}
                    >
                      ＋ {t("createFirst")}
                    </Link>
                  </div>
                </div>
              )}

              {!isProviderApproved && (
                <div className={styles.empty}>
                  {t("emptyNotProvider")}
                  <div className={styles.emptyActions}>
                    <Link
                      href={`/${locale}/tapti-teikeju`}
                      className={styles.newBtnSmall}
                    >
                      {t("becomeProvider")}
                    </Link>
                  </div>
                </div>
              )}

              {isProviderApproved &&
                services.map((s) => {
                  const img = s.imageUrl || "/default.png";
                  const cityName = s.city?.name ?? "—";
                  const catName = translateCategoryName(
                    s.category?.slug,
                    s.category?.name,
                    locale,
                  );
                  const date = formatDateByLocale(s.createdAt, locale);

                  return (
                    <article key={s.id} className={styles.serviceItem}>
                      <div className={styles.serviceThumb}>
                        <Image
                          src={img}
                          alt={s.title}
                          fill
                          className={styles.thumbImg}
                          sizes="120px"
                        />
                        {s.highlighted && (
                          <span className={styles.topBadge}>TOP</span>
                        )}
                      </div>

                      <div className={styles.serviceMain}>
                        <div className={styles.serviceTopRow}>
                          <div className={styles.serviceTitle}>{s.title}</div>
                          <span
                            className={
                              s.isActive
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {s.isActive ? t("statusActive") : t("statusInactive")}
                          </span>
                        </div>

                        <div className={styles.serviceMeta}>
                          <span className={styles.metaItem}>
                            <MapPin className={styles.metaIcon} />
                            {cityName}
                          </span>

                          <span className={styles.metaItem}>
                            <Folder className={styles.metaIcon} />
                            {catName}
                          </span>

                          <span className={styles.metaItem}>
                            <Calendar className={styles.metaIcon} />
                            {date}
                          </span>
                        </div>

                        <div className={styles.serviceActions}>
                          <Link
                            href={`/${locale}/services/${s.slug}`}
                            className={styles.actionLink}
                            aria-label={t("viewServiceAria")}
                          >
                            <Eye className={styles.actionIcon} />
                            <span>{t("view")}</span>
                          </Link>

                          <Link
                            href={`/${locale}/dashboard/services/${s.id}/edit`}
                            className={styles.actionLink}
                            aria-label={t("editServiceAria")}
                          >
                            <Pencil className={styles.actionIcon} />
                            <span>{t("edit")}</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {isProviderApproved && services.length > 0 && (
              <div className={styles.bottomAction}>
                <Link
                  href={`/${locale}/dashboard/services`}
                  className={styles.manageAllBtn}
                >
                  {t("manageAll")}
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}