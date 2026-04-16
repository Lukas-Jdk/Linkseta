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

type ExtraPlanInfo = {
  badge: string;
  kicker: string;
  accentLabel: string;
  accentValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  note: string;
};

function loginUrl(locale: string, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

function getPlanExtras(locale: string): Record<PlanSlug, ExtraPlanInfo> {
  if (locale === "en") {
    return {
      "free-trial": {
        badge: "Easy start",
        kicker: "Test the platform without risk",
        accentLabel: "Visibility",
        accentValue: "Basic",
        secondaryLabel: "Best for",
        secondaryValue: "First test",
        note: "Perfect to try the platform before moving to a paid plan.",
      },
      basic: {
        badge: "Good choice",
        kicker: "For providers who want more reach",
        accentLabel: "Visibility",
        accentValue: "Higher in category",
        secondaryLabel: "Best for",
        secondaryValue: "Solo providers",
        note: "Balanced option for active providers who want more serious visibility.",
      },
      premium: {
        badge: "Best value",
        kicker: "Maximum visibility and strongest placement",
        accentLabel: "Visibility",
        accentValue: "Homepage + TOP",
        secondaryLabel: "Best for",
        secondaryValue: "Growth",
        note: "Best option if you want the most visibility and strongest placement.",
      },
    };
  }

  if (locale === "no") {
    return {
      "free-trial": {
        badge: "Enkel start",
        kicker: "Prøv plattformen uten risiko",
        accentLabel: "Synlighet",
        accentValue: "Grunnleggende",
        secondaryLabel: "Passer for",
        secondaryValue: "Første test",
        note: "Perfekt for å teste plattformen før du går over til en betalt plan.",
      },
      basic: {
        badge: "Godt valg",
        kicker: "For leverandører som vil ha mer synlighet",
        accentLabel: "Synlighet",
        accentValue: "Høyere i kategori",
        secondaryLabel: "Passer for",
        secondaryValue: "Enkeltpersoner",
        note: "Et balansert valg for aktive leverandører som vil bli sett mer seriøst.",
      },
      premium: {
        badge: "Beste verdi",
        kicker: "Maksimal synlighet og sterkest plassering",
        accentLabel: "Synlighet",
        accentValue: "Hjemmeside + TOP",
        secondaryLabel: "Passer for",
        secondaryValue: "Vekst",
        note: "Beste valget hvis du vil ha mest mulig synlighet og sterkeste plassering.",
      },
    };
  }

  return {
    "free-trial": {
      badge: "Lengvas startas",
      kicker: "Išbandyk platformą be rizikos",
      accentLabel: "Matomumas",
      accentValue: "Bazinis",
      secondaryLabel: "Tinka",
      secondaryValue: "Pirmai pradžiai",
      note: "Puikus variantas išsibandyti platformą prieš pereinant prie mokamo plano.",
    },
    basic: {
      badge: "Geras pasirinkimas",
      kicker: "Paslaugų teikėjams, kurie nori daugiau matomumo",
      accentLabel: "Matomumas",
      accentValue: "Aukščiau kategorijoje",
      secondaryLabel: "Tinka",
      secondaryValue: "Individualiai veiklai",
      note: "Subalansuotas variantas aktyviam paslaugų teikėjui, kuris nori būti matomas rimčiau.",
    },
    premium: {
      badge: "Geriausia vertė",
      kicker: "Maksimalus matomumas ir stipriausia pozicija",
      accentLabel: "Matomumas",
      accentValue: "Homepage + TOP",
      secondaryLabel: "Tinka",
      secondaryValue: "Augimui",
      note: "Stipriausias variantas, jei nori daugiausia matomumo ir geriausios pozicijos.",
    },
  };
}

function getDisabledButtonLabel(locale: string) {
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

  const extras = useMemo(() => getPlanExtras(locale), [locale]);

  const plans: Plan[] = useMemo(
    () => [
      {
        slug: "free-trial",
        name: t("plans.freeTrial.name"),
        priceLabel: t("plans.freeTrial.priceLabel"),
        description: t("plans.freeTrial.description"),
        features: [
          t("plans.freeTrial.features.0"),
          t("plans.freeTrial.features.1"),
          t("plans.freeTrial.features.2"),
        ],
      },
      {
        slug: "basic",
        name: t("plans.basic.name"),
        priceLabel: t("plans.basic.priceLabel"),
        description: t("plans.basic.description"),
        features: [
          t("plans.basic.features.0"),
          t("plans.basic.features.1"),
          t("plans.basic.features.2"),
        ],
      },
      {
        slug: "premium",
        name: t("plans.premium.name"),
        priceLabel: t("plans.premium.priceLabel"),
        description: t("plans.premium.description"),
        features: [
          t("plans.premium.features.0"),
          t("plans.premium.features.1"),
          t("plans.premium.features.2"),
        ],
        recommended: true,
      },
    ],
    [t],
  );

  async function handleChoose(planSlug: PlanSlug) {
    if (planSlug !== "free-trial") return;

    setError(null);
    setLoadingSlug(planSlug);

    try {
      const res = await csrfFetch("/api/plans/choose", {
        method: "POST",
        body: JSON.stringify({ planSlug }),
      });

      if (res.status === 401) {
        router.push(loginUrl(locale, pathname));
        return;
      }

      const json = await res.json().catch(() => ({} as Record<string, unknown>));

      if (!res.ok) {
        setError(
          typeof json?.error === "string" ? json.error : t("errors.chooseFailed"),
        );
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
    {
      q: t("faq.items.first.q"),
      a: t("faq.items.first.a"),
    },
    {
      q: t("faq.items.second.q"),
      a: t("faq.items.second.a"),
    },
    {
      q: t("faq.items.third.q"),
      a: t("faq.items.third.a"),
    },
    {
      q: t("faq.items.fourth.q"),
      a: t("faq.items.fourth.a"),
    },
    {
      q: t("faq.items.fifth.q"),
      a: t("faq.items.fifth.a"),
    },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>LINKSETA PLANS</div>
            <h1 className={styles.heading}>{t("title")}</h1>
            <p className={styles.lead}>{t("lead")}</p>

            <p className={styles.demoNote}>
              💡 <strong>{t("noteStrong")}</strong> {t("noteText")}
            </p>
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.plansSection}>
          <div className={styles.plansGrid}>
            {plans.map((plan) => {
              const busy = loadingSlug === plan.slug;
              const disabled = plan.slug !== "free-trial";
              const extra = extras[plan.slug];

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
                    <span className={styles.planBadge}>{extra.badge}</span>

                    {plan.recommended && (
                      <span className={styles.planHighlightTag}>
                        {t("recommended")}
                      </span>
                    )}
                  </div>

                  <div className={styles.planHeader}>
                    <h2 className={styles.planName}>{plan.name}</h2>
                    <p className={styles.planPrice}>{plan.priceLabel}</p>
                    <p className={styles.planDescription}>{plan.description}</p>
                    <p className={styles.planKicker}>{extra.kicker}</p>
                  </div>

                  <div className={styles.planInfoGrid}>
                    <div className={styles.planInfoBox}>
                      <span className={styles.planInfoLabel}>{extra.accentLabel}</span>
                      <strong className={styles.planInfoValue}>
                        {extra.accentValue}
                      </strong>
                    </div>

                    <div className={styles.planInfoBox}>
                      <span className={styles.planInfoLabel}>
                        {extra.secondaryLabel}
                      </span>
                      <strong className={styles.planInfoValue}>
                        {extra.secondaryValue}
                      </strong>
                    </div>
                  </div>

                  <ul className={styles.featuresList}>
                    {plan.features.map((feature) => (
                      <li key={feature} className={styles.featureItem}>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <p className={styles.planNote}>{extra.note}</p>

                  <div className={styles.planBottom}>
                    {plan.slug === "free-trial" && (
                      <p className={styles.planSafetyNote}>{t("trialSafetyNote")}</p>
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
                      disabled={disabled || busy}
                      aria-disabled={disabled || busy}
                    >
                      {busy
                        ? t("buttonBusy")
                        : disabled
                          ? getDisabledButtonLabel(locale)
                          : t("buttonStartTrial")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className={styles.smallInfo}>{t("smallInfo")}</p>
        </section>

        <section className={styles.faqSection} aria-label={t("faq.title")}>
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