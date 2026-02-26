// src/app/[locale]/tapti-teikeju/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./tapti.module.css";

type PlanSlug = "demo" | "basic" | "premium";

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
    slug: "demo",
    name: "Demo planas",
    priceLabel: "0 NOK",
    description: "Puikus variantas išbandyti Linksetą testavimo laikotarpiu.",
    features: [
      "1 aktyvus skelbimas",
      "Rodomas paieškos rezultate",
      "Galite bet kada atnaujinti informaciją",
    ],
    recommended: true,
  },
  {
    slug: "basic",
    name: "Basic",
    priceLabel: "199 NOK / mėn",
    description: "Standartinis planas (apmokėjimai bus įjungti vėliau).",
    features: ["Iki 3 aktyvių skelbimų", "Didesnis matomumas", "Paprastas valdymas iš panelės"],
    comingSoon: true,
  },
  {
    slug: "premium",
    name: "Premium",
    priceLabel: "399 NOK / mėn",
    description: "Didžiausias planas (apmokėjimai bus įjungti vėliau).",
    features: ["Iki 10 aktyvių skelbimų", "TOP statusas", "Daugiau vietos turiniui"],
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

  const canChoose = useMemo(() => {
    // jei vėliau norėsi čia dar logikos – pvz. pagal env rodyti kitaip
    return true;
  }, []);

  async function handleChoose(planSlug: PlanSlug) {
    // Basic/Premium yra disabled (Coming soon)
    if (planSlug !== "demo") return;

    setError(null);
    setLoadingSlug(planSlug);

    try {
      // tavo backend'e dabar yra /api/plans/choose — naudokim jį tiesiai
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
          💡 <strong>Šiuo metu veikia DEMO režimas.</strong> Veikia tik Demo planas.
          Kiti planai bus aktyvuoti vėliau (Stripe / Vipps).
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => {
            const disabled = plan.slug !== "demo" || !canChoose;
            const busy = loadingSlug === plan.slug;

            return (
              <article
                key={plan.slug}
                className={`${styles.planCard} ${plan.recommended ? styles.planCardRecommended : ""}`}
                aria-disabled={disabled ? "true" : "false"}
                style={disabled ? { opacity: 0.75 } : undefined}
              >
                {plan.recommended && <div className={styles.tag}>Rekomenduojamas DEMO</div>}
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
                  title={disabled ? "Šis planas dar neaktyvus (coming soon)" : undefined}
                >
                  {busy ? "Vykdoma..." : disabled ? "Netrukus" : "Pasirinkti šį planą"}
                </button>
              </article>
            );
          })}
        </div>

        <p className={styles.smallInfo}>
          Pasirinkus Demo planą būsite nukreiptas į savo paskyrą, kur galėsite susikurti paslaugos skelbimą
          (pavadinimas, aprašymas, kaina, nuotrauka ir t.t.).
        </p>
      </div>
    </main>
  );
}