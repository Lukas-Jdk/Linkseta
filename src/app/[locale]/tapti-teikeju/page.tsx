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
  comingSoon?: boolean;
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

  const canChoose = useMemo(() => true, []);

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
        recommended: true,
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
        comingSoon: true,
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
        comingSoon: true,
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

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(json?.error || t("errors.chooseFailed"));
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

  return (
    <main>
      <div className={styles.wrapper}>
        <h1 className={styles.heading}>{t("title")}</h1>
        <p className={styles.lead}>{t("lead")}</p>

        <p className={styles.demoNote}>
          💡 <strong>{t("noteStrong")}</strong> {t("noteText")}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.plansGrid}>
          {plans.map((plan) => {
            const disabled = plan.slug !== "free-trial" || !canChoose;
            const busy = loadingSlug === plan.slug;

            return (
              <article
                key={plan.slug}
                className={`${styles.planCard} ${
                  plan.recommended ? styles.planCardRecommended : ""
                }`}
                data-disabled={disabled ? "true" : "false"}
                style={disabled ? { opacity: 0.75 } : undefined}
              >
                {plan.recommended && (
                  <div className={styles.tag}>{t("recommended")}</div>
                )}
                {plan.comingSoon && (
                  <div className={styles.tag}>{t("comingSoon")}</div>
                )}

                <h2 className={styles.planName}>{plan.name}</h2>
                <p className={styles.planPrice}>{plan.priceLabel}</p>
                <p className={styles.planDescription}>{plan.description}</p>

                <ul className={styles.featuresList}>
                  {plan.features.map((f) => (
                    <li key={f} className={styles.featureItem}>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`btn btn-primary ${styles.planButton}`}
                  onClick={() => handleChoose(plan.slug)}
                  disabled={disabled || busy}
                  aria-disabled={disabled || busy}
                  title={disabled ? t("inactivePlanTitle") : undefined}
                >
                  {busy
                    ? t("buttonBusy")
                    : disabled
                      ? t("buttonSoon")
                      : t("buttonStartTrial")}
                </button>
              </article>
            );
          })}
        </div>

        <p className={styles.smallInfo}>{t("smallInfo")}</p>
      </div>
    </main>
  );
}