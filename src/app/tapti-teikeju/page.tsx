// src/app/tapti-teikeju/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import styles from "./tapti.module.css";

type City = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

export default function TaptiTeikejuPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Tikrinam ar useris prisijungęs
  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();

        if (data.user) {
          setIsLoggedIn(true);
          setEmail(data.user.email ?? "");
        } else {
          setIsLoggedIn(false);
        }
      } catch (e) {
        console.error("tapti-teikeju user error:", e);
        setIsLoggedIn(false);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  // 2. Užkraunam miestus ir kategorijas
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/dashboard/filters");
        if (!res.ok) return;
        const json = await res.json();
        setCities(json.cities ?? []);
        setCategories(json.categories ?? []);
      } catch (e) {
        console.error("tapti-teikeju filters error:", e);
      }
    }

    loadFilters();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/provider-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          cityId: cityId || null,
          categoryId: categoryId || null,
          message,
        }),
      });

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        // jei atsakymas ne JSON (pvz. HTML) – tiesiog praleidžiam
      }

      if (!res.ok) {
        console.error("provider-request failed:", json);

        // 🔹 Čia sutvarkom TypeScript – VISADA grąžinam string
        let errorMessage =
          "Nepavyko išsiųsti paraiškos. Bandykite dar kartą.";

        if (
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error?: string }).error === "string"
        ) {
          errorMessage = (json as { error: string }).error;
        }

        setError(errorMessage);
        return;
      }

      setSuccess(
        "Paraiška išsiųsta! Peržiūrėsime ją ir susisieksime el. paštu, kai patvirtinsime."
      );
      setMessage("");
      // city & category paliekam užpildytus
    } catch (e) {
      console.error("provider-request error:", e);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingUser) {
    return (
      <main className={styles.wrapper}>
        <h1 className={styles.heading}>Tapk paslaugų teikėju</h1>
        <p>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Tapk paslaugų teikėju Linkseta</h1>

      <p className={styles.introText}>
        Jei teiki paslaugas Norvegijoje (statybos, remontas, valymas,
        automobilių servisas ar kitos paslaugos) – čia gali pateikti paraišką
        ir tapti matomas lietuvių bendruomenei visoje Norvegijoje.
      </p>

      {/* Jei NEprisijungęs – prašom prisijungti / užsiregistruoti */}
      {!isLoggedIn && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Pirmiausia prisijunkite</h2>
          <p className={styles.text}>
            Norėdami pateikti paraišką ir tapti paslaugų teikėju, pirmiausia
            susikurkite paskyrą arba prisijunkite prie esamos. Taip galėsime
            susieti paraišką su jūsų paskyra ir leisti valdyti savo paslaugas.
          </p>

          <div className={styles.actionsRow}>
            <Link href="/login" className={styles.secondaryButton}>
              Prisijungti
            </Link>
            <Link href="/register" className={styles.primaryButton}>
              Registracija
            </Link>
          </div>
        </section>
      )}

      {/* Jei prisijungęs – rodom paraiškos formą */}
      {isLoggedIn && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Paraiška tapti paslaugų teikėju</h2>
          <p className={styles.textSmall}>
            Jūsų paskyros el. paštas: <strong>{email}</strong>
          </p>
          <p className={styles.textSmall}>
            Užpildykite formą kuo tiksliau – tai padės greičiau patvirtinti
            jūsų paskyrą ir suprasti, kokias paslaugas teikiate.
          </p>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label}>
                Vardas, pavardė / įmonės pavadinimas
              </label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Telefonas</label>
                <input
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Miestas</label>
                <select
                  className={styles.input}
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                >
                  <option value="">Pasirinkite miestą</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Pagrindinė kategorija</label>
                <select
                  className={styles.input}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Pasirinkite kategoriją</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Papasakokite trumpai apie save ir savo paslaugas
              </label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ką tiksliai darote, kokioje srityje dirbate, kokia patirtis, kokius miestus aptarnaujate ir pan."
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? "Siunčiama..." : "Siųsti paraišką"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
