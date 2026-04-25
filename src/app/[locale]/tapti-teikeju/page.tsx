// src/app/[locale]/tapti-teikeju/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./tapti.module.css";

type PlanSlug = "free-trial" | "basic" | "premium";

type Plan = {
  slug: PlanSlug;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

function loginUrl(locale: string, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

function getPlanBadge(locale: string, slug: PlanSlug) {
  if (locale === "en") {
    if (slug === "premium") return "Best value";
    if (slug === "basic") return "Good choice";
    return "Easy start";
  }

  if (locale === "no") {
    if (slug === "premium") return "Best verdi";
    if (slug === "basic") return "Godt valg";
    return "Enkel start";
  }

  if (slug === "premium") return "Geriausias pasirinkimas";
  if (slug === "basic") return "Geras pasirinkimas";
  return "Lengva pradžia";
}

function getPaidButtonLabel(locale: string) {
  if (locale === "en") return "Choose plan";
  if (locale === "no") return "Velg plan";
  return "Pasirinkti planą";
}

export default function TaptiTeikejuPage() {
  const t = useTranslations("becomeProviderPage");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? "lt";

  const [loadingSlug, setLoadingSlug] = useState<PlanSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans: Plan[] = useMemo(
    () => [
      {
        slug: "free-trial",
        name: t("plans.freeTrial.name"),
        priceLabel: t("plans.freeTrial.priceLabel"),
        description: t("plans.freeTrial.description"),
        features: t.raw("plans.freeTrial.features") as string[],
      },
      {
        slug: "basic",
        name: t("plans.basic.name"),
        priceLabel: t("plans.basic.priceLabel"),
        description: t("plans.basic.description"),
        features: t.raw("plans.basic.features") as string[],
      },
      {
        slug: "premium",
        name: t("plans.premium.name"),
        priceLabel: t("plans.premium.priceLabel"),
        description: t("plans.premium.description"),
        features: t.raw("plans.premium.features") as string[],
        recommended: true,
      },
    ],
    [t],
  );

  async function handleChoose(planSlug: PlanSlug) {
    setError(null);
    setLoadingSlug(planSlug);

    try {
      const endpoint =
        planSlug === "free-trial" ? "/api/plans/choose" : "/api/stripe/checkout";

      const res = await csrfFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ planSlug, locale }),
      });

      if (res.status === 401) {
        router.push(loginUrl(locale, pathname));
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof json?.error === "string"
            ? json.error
            : t("errors.chooseFailed"),
        );
        return;
      }

      if (planSlug === "basic" || planSlug === "premium") {
        if (typeof json?.url === "string") {
          window.location.href = json.url;
          return;
        }

        setError("Nepavyko atidaryti Stripe Checkout.");
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(t("errors.server"));
    } finally {
      setLoadingSlug(null);
    }
  }

  const faqItems = [
    { q: t("faq.items.first.q"), a: t("faq.items.first.a") },
    { q: t("faq.items.second.q"), a: t("faq.items.second.a") },
    { q: t("faq.items.third.q"), a: t("faq.items.third.a") },
    { q: t("faq.items.fourth.q"), a: t("faq.items.fourth.a") },
    { q: t("faq.items.fifth.q"), a: t("faq.items.fifth.a") },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>LINKSETA PLANS</div>
            <h1 className={styles.heading}>{t("title")}</h1>
            <p className={styles.lead}>{t("lead")}</p>
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.plansSection}>
          <div className={styles.plansGrid}>
            {plans.map((plan) => {
              const busy = loadingSlug === plan.slug;

              return (
                <article
                  key={plan.slug}
                  className={`${styles.planCard} ${
                    plan.slug === "free-trial"
                      ? styles.planCardTrial
                      : plan.slug === "basic"
                        ? styles.planCardBasic
                        : styles.planCardPremium
                  } ${plan.recommended ? styles.planCardRecommended : ""}`}
                >
                  <div className={styles.planTop}>
                    <span className={styles.planBadge}>
                      {getPlanBadge(locale, plan.slug)}
                    </span>

                    {plan.recommended && (
                      <span className={styles.planHighlightTag}>
                        {t("recommended")}
                      </span>
                    )}
                  </div>

                  <div className={styles.planHeader}>
                    <h2 className={styles.planName}>{plan.name}</h2>
                    <p className={styles.planPrice}>{plan.priceLabel}</p>

                    {plan.description ? (
                      <p className={styles.planDescription}>
                        {plan.description}
                      </p>
                    ) : null}
                  </div>

                  <ul className={styles.featuresList}>
                    {plan.features.map((feature, i) => (
                      <li key={i} className={styles.featureItem}>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className={styles.planBottom}>
                    {plan.slug === "free-trial" && (
                      <p className={styles.planSafetyNote}>
                        {t("trialSafetyNote")}
                      </p>
                    )}

                    <button
                      type="button"
                      className={`${styles.planButton} ${
                        plan.slug === "premium"
                          ? styles.planButtonPremium
                          : plan.slug === "basic"
                            ? styles.planButtonBasic
                            : styles.planButtonTrial
                      }`}
                      onClick={() => handleChoose(plan.slug)}
                      disabled={busy}
                    >
                      {busy
                        ? t("buttonBusy")
                        : plan.slug === "free-trial"
                          ? t("buttonStartTrial")
                          : getPaidButtonLabel(locale)}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className={styles.smallInfo}>{t("smallInfo")}</p>
        </section>

        <section className={styles.faqSection}>
          <h2 className={styles.faqTitle}>{t("faq.title")}</h2>

          <div className={styles.faqList}>
            {faqItems.map((item) => (
              <article key={item.q} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>{item.q}</h3>
                <p className={styles.faqAnswer}>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}