// src/app/[locale]/tapti-teikeju/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/csrfClient";
import {
  ShieldCheck,
  RotateCcw,
  PauseCircle,
  Headphones,
  Gem,
  Crown,
  Gift,
  Star,
  LockKeyhole,
  MessageCircle,
  Clock3,
} from "lucide-react";

import styles from "./tapti.module.css";

type PlanSlug = "basic" | "premium" | "free-trial";

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
      {
        slug: "free-trial",
        name: t("plans.freeTrial.name"),
        priceLabel: t("plans.freeTrial.priceLabel"),
        description: t("plans.freeTrial.description"),
        features: t.raw("plans.freeTrial.features") as string[],
      },
    ],
    [t],
  );

  async function handleChoose(planSlug: PlanSlug) {
    setError(null);
    setLoadingSlug(planSlug);

    try {
      const endpoint =
        planSlug === "free-trial"
          ? "/api/plans/choose"
          : "/api/stripe/checkout";

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

        setError(t("errors.checkoutFailed"));
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
  ];

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>{t("eyebrow")}</div>
          <h1 className={styles.heading}>{t("title")}</h1>
          <p className={styles.lead}>{t("lead")}</p>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.plansSection}>
          <div className={styles.plansGrid}>
            {plans.map((plan) => {
              const busy = loadingSlug === plan.slug;

              const isBasic = plan.slug === "basic";
              const isPremium = plan.slug === "premium";
              const isTrial = plan.slug === "free-trial";

              return (
                <article
                  key={plan.slug}
                  className={`${styles.planCard} ${
                    isTrial
                      ? styles.planCardTrial
                      : isBasic
                        ? styles.planCardBasic
                        : styles.planCardPremium
                  }`}
                >
                  {isPremium && (
                    <div className={styles.popularBadge}>
                      <Star className={styles.popularIcon} />
                      {t("popular")}
                    </div>
                  )}

                  <div className={styles.planHeader}>
                    <div className={styles.planTitleRow}>
                      <div className={styles.planIconBox}>
                        {isBasic && <Gem className={styles.planIcon} />}
                        {isPremium && <Crown className={styles.planIcon} />}
                        {isTrial && <Gift className={styles.planIcon} />}
                      </div>

                      <h2 className={styles.planName}>{plan.name}</h2>
                    </div>

                    <p className={styles.planPrice}>{plan.priceLabel}</p>

                    <div className={styles.divider} />

                    <p className={styles.planDescription}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className={styles.featuresList}>
                    {plan.features.map((feature, i) => (
                      <li key={i} className={styles.featureItem}>
                        {feature}

                        {isPremium &&
                          feature
                            .toLowerCase()
                            .includes(t("chatKeyword").toLowerCase()) && (
                            <span className={styles.newTag}>
                              {t("newTag")}
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>

                  <div className={styles.planBottom}>
                    {isBasic && (
                      <div className={styles.infoBox}>
                        <LockKeyhole className={styles.infoIcon} />
                        <div>
                          <strong>{t("info.basicTitle")}</strong>
                          <p>{t("info.basicText")}</p>
                        </div>
                      </div>
                    )}

                    {isPremium && (
                      <div className={styles.infoBoxPremium}>
                        <MessageCircle className={styles.infoIcon} />
                        <div>
                          <strong>{t("info.premiumTitle")}</strong>
                          <p>{t("info.premiumText")}</p>
                        </div>
                      </div>
                    )}

                    {isTrial && (
                      <div className={styles.infoBoxTrial}>
                        <Clock3 className={styles.infoIcon} />
                        <div>
                          <strong>{t("info.trialTitle")}</strong>
                          <p>{t("info.trialText")}</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className={`${styles.planButton} ${
                        isPremium
                          ? styles.planButtonPremium
                          : isBasic
                            ? styles.planButtonBasic
                            : styles.planButtonTrial
                      }`}
                      onClick={() => handleChoose(plan.slug)}
                      disabled={busy}
                    >
                      {busy
                        ? t("buttonBusy")
                        : isTrial
                          ? t("buttonStartTrialFull")
                          : isBasic
                            ? t("buttonChooseBasic")
                            : t("buttonChoosePremium")}
                    </button>

                    <div className={styles.planCancelNote}>
                      {t("commitmentNote")}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.benefitsRow}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIconBox}>
                <ShieldCheck className={styles.benefitIcon} />
              </div>
              <div>
                <div className={styles.benefitTitle}>
                  {t("benefits.secureTitle")}
                </div>
                <div className={styles.benefitSub}>
                  {t("benefits.secureSub")}
                </div>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.benefitIconBox}>
                <RotateCcw className={styles.benefitIcon} />
              </div>
              <div>
                <div className={styles.benefitTitle}>
                  {t("benefits.flexTitle")}
                </div>
                <div className={styles.benefitSub}>
                  {t("benefits.flexSub")}
                </div>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.benefitIconBox}>
                <PauseCircle className={styles.benefitIcon} />
              </div>
              <div>
                <div className={styles.benefitTitle}>
                  {t("benefits.cancelTitle")}
                </div>
                <div className={styles.benefitSub}>
                  {t("benefits.cancelSub")}
                </div>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.benefitIconBox}>
                <Headphones className={styles.benefitIcon} />
              </div>
              <div>
                <div className={styles.benefitTitle}>
                  {t("benefits.supportTitle")}
                </div>
                <div className={styles.benefitSub}>
                  {t("benefits.supportSub")}
                </div>
              </div>
            </div>
          </div>
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