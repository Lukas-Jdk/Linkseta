// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

type ProviderStatus = "NONE" | "PENDING" | "APPROVED";

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatus>("NONE");

  const [error, setError] = useState<string | null>(null);

  // 1. Pasiimam prisijungusį userį
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      setLoadingUser(false);
    }

    loadUser();
  }, [router]);

  // 2. Pasiimam teikėjo statusą pagal email
  useEffect(() => {
    if (!email) return;

    async function loadStatus() {
      try {
        setLoadingStatus(true);
        const res = await fetch("/api/dashboard/provider-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error("provider-status failed:", json);
          setError("Nepavyko užkrauti teikėjo statuso.");
          return;
        }

        setProviderStatus(json.status as ProviderStatus);
      } catch (e) {
        console.error("provider-status error:", e);
        setError("Serverio klaida.");
      } finally {
        setLoadingStatus(false);
      }
    }

    loadStatus();
  }, [email]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loadingUser || loadingStatus) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.loading}>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.title}>Mano paskyra</h1>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.card}>
        <h2 className={styles.welcome}>
          Sveikas sugrįžęs,
          <span className={styles.email}>{email}</span>
        </h2>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Bendra informacija</h3>
          <p className={styles.text}>
            Čia matysi savo paskyros būseną, paslaugas ir nuorodas į
            svarbiausias vietas.
          </p>

          <div className={styles.linksRow}>
            <button
              type="button"
              className={styles.actionSecondary}
              onClick={() => router.push("/services")}
            >
              Peržiūrėti paslaugas
            </button>
          </div>
        </div>

        {/* 1️⃣ Nėra jokios paraiškos / profilio */}
        {providerStatus === "NONE" && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Kol kas nesate paslaugų teikėjas
            </h3>
            <p className={styles.text}>
              Norėdami skelbti savo paslaugas ir būti matomi Linkseta
              platformoje, pateikite paraišką tapti paslaugų teikėju.
            </p>

            <div className={styles.linksRow}>
              <button
                type="button"
                className={styles.actionPrimary}
                onClick={() => router.push("/tapti-teikeju")}
              >
                Tapti paslaugų teikėju
              </button>
            </div>
          </div>
        )}

        {/* 2️⃣ Pateikta paraiška, bet dar tikrinama */}
        {providerStatus === "PENDING" && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Jūsų paraiška tikrinama
            </h3>
            <p className={styles.text}>
              Esate pateikę paraišką tapti paslaugų teikėju. Administratorius
              ją peržiūrės ir, patvirtinus, galėsite kurti ir valdyti savo
              paslaugas skiltyje „Mano paslaugos“.
            </p>
            <p className={styles.textSmall}>
              Jei paraišką pateikėte per klaidą arba norite ką nors
              pakeisti, galite parašyti mums per skiltį „Susisiekite“.
            </p>
          </div>
        )}

        {/* 3️⃣ Patvirtintas teikėjas */}
        {providerStatus === "APPROVED" && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Esate patvirtintas paslaugų teikėjas
            </h3>
            <p className={styles.text}>
              Dabar galite kurti ir valdyti savo paslaugas. Skelbimai bus
              matomi Linkseta platformoje paslaugų sąraše.
            </p>

            <div className={styles.linksRow}>
              <button
                type="button"
                className={styles.actionPrimary}
                onClick={() => router.push("/dashboard/services")}
              >
                Mano paslaugos
              </button>
            </div>
          </div>
        )}

        <div className={styles.footerRow}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Atsijungti
          </button>
        </div>
      </section>
    </main>
  );
}
