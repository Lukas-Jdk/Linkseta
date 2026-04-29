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
import BillingPortalButton from "./BillingPortalButton";
import {
  MapPin,
  Folder,
  Calendar,
  Eye,
  Pencil,
  Crown,
  Gem,
  ShieldCheck,
  BriefcaseBusiness,
  PackageOpen,
  Plus,
  CheckCircle2,
} from "lucide-react";

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

function formatNullableDate(value: Date | null | undefined, locale: string) {
  if (!value) return "—";

  const map: Record<string, string> = {
    lt: "lt-LT",
    en: "en-GB",
    no: "nb-NO",
  };

  return new Intl.DateTimeFormat(map[locale] ?? "lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

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
      select: {
        isApproved: true,
        lifetimeFree: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        plan: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.serviceListing.findMany({
      where: {
        userId: authUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        titleEn: true,
        titleNo: true,
        slug: true,
        createdAt: true,
        isActive: true,
        highlighted: true,
        imageUrl: true,

        locationCity: true,
        locationPostcode: true,
        locationRegion: true,

        city: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isProviderApproved = Boolean(profile?.isApproved);
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;

  function getBillingStatus() {
    if (profile?.stripeSubscriptionId) {
      if (profile.subscriptionStatus === "active")
        return t("billingStripeActive");
      if (profile.subscriptionStatus === "trialing")
        return t("billingStripeTrial");
      if (profile.subscriptionStatus === "past_due")
        return t("billingStripePastDue");
      if (profile.subscriptionStatus === "canceled")
        return t("billingStripeCanceled");
      return profile.subscriptionStatus ?? t("billingNone");
    }

    if (profile?.lifetimeFree) return t("billingLifetime");
    if (profile?.trialEndsAt) return t("billingFreeTrial");
    if (profile?.plan) return t("billingManual");

    return t("billingNone");
  }

  function getPlanIcon() {
    if (profile?.plan?.slug === "premium") {
      return <Crown className={styles.billingPlanIcon} />;
    }

    if (profile?.plan?.slug === "basic") {
      return <Gem className={styles.billingPlanIcon} />;
    }

    return <CheckCircle2 className={styles.billingPlanIcon} />;
  }

  const validUntil = profile?.currentPeriodEnd ?? profile?.trialEndsAt ?? null;

  return (
    <main className={styles.page}>
      <div className="container">
        <section className={styles.topCard}>
          <div className={styles.topIcon}>
            <BriefcaseBusiness className={styles.topIconSvg} />
          </div>

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
                <Plus className={styles.newBtnIcon} />
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

          <div className={styles.dashboardMain}>
            <section className={styles.billingCard}>
              <div className={styles.billingHeader}>
                <div className={styles.billingHeaderIcon}>
                  <Gem className={styles.billingHeaderIconSvg} />
                </div>

                <h2 className={styles.billingTitle}>{t("billingTitle")}</h2>

                <ShieldCheck className={styles.billingShield} />
              </div>

              <div className={styles.billingInfoGrid}>
                <div className={styles.billingPlanBox}>
                  <div className={styles.billingLabel}>{t("billingPlan")}</div>

                  <div className={styles.billingPlanValue}>
                    <span className={styles.billingPlanBadge}>
                      {getPlanIcon()}
                      {profile?.plan?.name ?? "—"}
                    </span>
                  </div>

                  <div className={styles.billingHint}>
                    {profile?.plan?.slug === "premium"
                      ? "Aukščiausios galimybės"
                      : profile?.plan?.slug === "basic"
                        ? "Daugiau galimybių"
                        : "Pradinis planas"}
                  </div>
                </div>

                <div className={styles.billingBox}>
                  <div className={styles.billingLabel}>
                    {t("billingStatus")}
                  </div>

                  <span className={styles.billingStatusBadge}>
                    {getBillingStatus()}
                  </span>

                  <div className={styles.billingHint}>
                    {profile?.stripeSubscriptionId
                      ? "Mokėjimas vyksta automatiškai"
                      : profile?.lifetimeFree
                        ? "Mokėjimo išimtis"
                        : "Rankinis statusas"}
                  </div>
                </div>

                <div className={styles.billingBox}>
                  <div className={styles.billingLabel}>
                    {t("billingValidUntil")}
                  </div>

                  <div className={styles.billingDateValue}>
                    <Calendar className={styles.billingDateIcon} />
                    {formatNullableDate(validUntil, locale)}
                  </div>

                  {profile?.stripeSubscriptionId && (
                    <div className={styles.billingActions}>
                      <BillingPortalButton
                        label={t("billingManage")}
                        loadingLabel={t("billingManageLoading")}
                      />
                    </div>
                  )}

                  <div className={styles.billingHint}>
                    {validUntil ? "Aktyvus laikotarpis" : "Data nenurodyta"}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.servicesCard}>
              <div className={styles.servicesHeader}>
                <div className={styles.servicesTitleWrap}>
                  <div className={styles.servicesIcon}>
                    <BriefcaseBusiness className={styles.servicesIconSvg} />
                  </div>

                  <h2 className={styles.h2}>{t("myServices")}</h2>
                </div>

                <div className={styles.servicesCount}>
                  {activeServices} {t("active")}
                </div>
              </div>

              <div className={styles.servicesList}>
                {isProviderApproved && services.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <PackageOpen className={styles.emptyIconSvg} />
                    </div>

                    <h3 className={styles.emptyTitle}>
                      Dar neturite paslaugų skelbimų
                    </h3>

                    <p className={styles.emptyText}>
                      Sukurkite pirmą skelbimą ir pradėkite pritraukti klientus.
                    </p>

                    <Link
                      href={`/${locale}/dashboard/services/new`}
                      className={styles.emptyBtn}
                    >
                      <Plus className={styles.emptyBtnIcon} />
                      {t("createFirst")}
                    </Link>
                  </div>
                )}

                {!isProviderApproved && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <PackageOpen className={styles.emptyIconSvg} />
                    </div>

                    <h3 className={styles.emptyTitle}>
                      {t("emptyNotProvider")}
                    </h3>

                    <Link
                      href={`/${locale}/tapti-teikeju`}
                      className={styles.emptyBtn}
                    >
                      {t("becomeProvider")}
                    </Link>
                  </div>
                )}

                {isProviderApproved &&
                  services.map((s) => {
                    const img = s.imageUrl || "/default.png";
                    const cityName =
                      [s.locationPostcode, s.locationCity || s.city?.name]
                        .filter(Boolean)
                        .join(" ") || "—";
                    const catName = translateCategoryName(
                      s.category?.slug,
                      s.category?.name,
                      locale,
                    );
                    const date = formatDateByLocale(s.createdAt, locale);
                    const localizedTitle = pickLocalizedValue(
                      locale,
                      s.title,
                      s.titleEn,
                      s.titleNo,
                    );

                    return (
                      <article key={s.id} className={styles.serviceItem}>
                        <div className={styles.serviceThumb}>
                          <Image
                            src={img}
                            alt={localizedTitle}
                            fill
                            className={styles.thumbImg}
                            sizes="160px"
                          />

                          {s.highlighted && (
                            <span className={styles.topBadge}>TOP</span>
                          )}
                        </div>

                        <div className={styles.serviceMain}>
                          <div className={styles.serviceTopRow}>
                            <div className={styles.serviceTitle}>
                              {localizedTitle}
                            </div>

                            <span
                              className={
                                s.isActive
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }
                            >
                              {s.isActive
                                ? t("statusActive")
                                : t("statusInactive")}
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
      </div>
    </main>
  );
}
