// src/app/[locale]/tapti-teikeju/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
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

const PLANS: Plan[] = [
  {
    slug: "free-trial",
    name: "Free Trial",
    priceLabel: "0 NOK / 30 dienų",
    description: "Išbandyk Linksetą be rizikos ir pasižiūrėk, ar platforma tinka tavo paslaugoms.",
    features: [
      "1 aktyvus skelbimas",
      "Iki 3 nuotraukų galerijoje",
      "30 dienų nemokamas išbandymas",
    ],
    recommended: true,
  },
  {
    slug: "basic",
    name: "Basic",
    priceLabel: "199 NOK / mėn",
    description: "Geras variantas individualiam paslaugų teikėjui, kuris nori daugiau matomumo.",
    features: [
      "Iki 3 aktyvių skelbimų",
      "Iki 5 nuotraukų kiekvienam skelbimui",
      "Paprastas valdymas iš panelės",
    ],
    comingSoon: true,
  },
  {
    slug: "premium",
    name: "Premium",
    priceLabel: "399 NOK / mėn",
    description: "Skirta tiems, kas nori maksimalios laisvės ir stipresnio matomumo.",
    features: [
      "Iki 10 aktyvių skelbimų",
      "Iki 15 nuotraukų kiekvienam skelbimui",
      "TOP statusas",
    ],
    comingSoon: true,
  },
];

function loginUrl(locale: string, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

export default function TaptiTeikejuPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? "lt";

  const [loadingSlug, setLoadingSlug] = useState<PlanSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canChoose = useMemo(() => true, []);

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
        setError(json?.error || "Nepavyko pasirinkti plano. Bandykite dar kartą.");
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoadingSlug(null);
    }
  }

  return (
    <main>
      <div className={styles.wrapper}>
        <h1 className={styles.heading}>Tapk paslaugų teikėju Linksetoje</h1>
        <p className={styles.lead}>
          Pasirink planą ir gauk galimybę kurti savo paslaugų skelbimus, kad žmonės Norvegijoje lengvai tave rastų.
        </p>

        <p className={styles.demoNote}>
          💡 <strong>Šiuo metu aktyvus Free Trial.</strong> Basic ir Premium planai bus
          įjungti vėliau.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => {
            const disabled = plan.slug !== "free-trial" || !canChoose;
            const busy = loadingSlug === plan.slug;

            return (
              <article
                key={plan.slug}
                className={`${styles.planCard} ${plan.recommended ? styles.planCardRecommended : ""}`}
                data-disabled={disabled ? "true" : "false"}
                style={disabled ? { opacity: 0.75 } : undefined}
              >
                {plan.recommended && <div className={styles.tag}>Rekomenduojamas</div>}
                {plan.comingSoon && <div className={styles.tag}>Coming soon</div>}

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
                  title={disabled ? "Šis planas dar neaktyvus" : undefined}
                >
                  {busy ? "Vykdoma..." : disabled ? "Netrukus" : "Pradėti Free Trial"}
                </button>
              </article>
            );
          })}
        </div>

        <p className={styles.smallInfo}>
          Pasirinkus Free Trial būsite nukreiptas į savo paskyrą, kur galėsite sukurti
          pirmą skelbimą ir įkelti iki 3 nuotraukų galerijoje.
        </p>
      </div>
    </main>
  );
}