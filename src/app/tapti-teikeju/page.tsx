// src/app/tapti-teikeju/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./tapti.module.css";

type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "plan_demo",
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
    id: "plan_basic",
    name: "Basic (paruoštas ateičiai)",
    priceLabel: "199 NOK / mėn (bus vėliau)",
    description: "Standartinis planas, kai įjungsim Stripe/Vipps apmokėjimus.",
    features: [
      "Iki 3 aktyvių skelbimų",
      "Matomumas visoje Norvegijoje",
      "Paprastas valdymas iš panelės",
    ],
  },
  {
    id: "plan_premium",
    name: "Premium (paruoštas ateičiai)",
    priceLabel: "399 NOK / mėn (bus vėliau)",
    description: "Didesniam verslui, kai paleisim pilną versiją.",
    features: [
      "Iki 10 aktyvių skelbimų",
      "Pažymėjimas kaip “Išskirtinis”",
      "Daugiau vietos aprašymui ir nuotraukoms",
    ],
  },
];

export default function TaptiTeikejuPage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(planId: string) {
    setError(null);
    setLoadingId(planId);

    try {
      const res = await fetch("/api/dashboard/become-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        // neprisijungęs
        router.push("/login");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setError(
          json.error || "Nepavyko pasirinkti plano. Bandykite dar kartą."
        );
        return;
      }

      // DEMO: iškart nukreipiam į dashboard (ten gales kurti skelbimą)
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <main>
      <div className={styles.wrapper}>
        <h1 className={styles.heading}>Tapk paslaugų teikėju Linksetoje</h1>
        <p className={styles.lead}>
          Pasirink planą ir gauk galimybę sukurti savo paslaugų skelbimus, kad
          lietuviai Norvegijoje lengvai tave rastų.
        </p>

        <p className={styles.demoNote}>
          💡 <strong>Šiuo metu veikia DEMO režimas.</strong> Visi planai yra
          nemokami, apmokėjimai (Stripe / Vipps) bus įjungti vėliau – dabar
          tiesiog pasirink planą ir sistema automatiškai suteiks paslaugų
          teikėjo statusą.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`${styles.planCard} ${
                plan.recommended ? styles.planCardRecommended : ""
              }`}
            >
              {plan.recommended && (
                <div className={styles.tag}>Rekomenduojamas DEMO</div>
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
                onClick={() => handleChoose(plan.id)}
                disabled={loadingId === plan.id}
              >
                {loadingId === plan.id ? "Vykdoma..." : "Pasirinkti šį planą"}
              </button>
            </article>
          ))}
        </div>

        <p className={styles.smallInfo}>
          Po plano pasirinkimo būsite nukreiptas į savo paskyrą, kur galėsite
          susikurti pilną paslaugų skelbimą (pavadinimas, aprašymas, kaina,
          nuotrauka ir t.t.).
        </p>
      </div>
    </main>
  );
}
