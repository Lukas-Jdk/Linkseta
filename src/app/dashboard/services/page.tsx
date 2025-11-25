// src/app/dashboard/services/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import styles from "./services.module.css";

type City = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type ProviderProfile = {
  id: string;
  isApproved: boolean;
  companyName: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string;
  city?: { name: string } | null;
  category?: { name: string } | null;
  priceFrom: number | null;
  createdAt: string;
  slug: string;
};

export default function DashboardServicesPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [providerProfile, setProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");

  const [creating, setCreating] = useState(false);

  // 1. auth
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const userEmail = data.user.email;
      if (!userEmail) {
        router.replace("/login");
        return;
      }

      setEmail(userEmail);
    }

    loadUser();
  }, [router]);

  // 2. cities + categories
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/dashboard/filters");
        if (!res.ok) return;
        const json = await res.json();
        setCities(json.cities ?? []);
        setCategories(json.categories ?? []);
      } catch (e) {
        console.error("filters error:", e);
      }
    }

    loadFilters();
  }, []);

  // 3. services + providerProfile
  useEffect(() => {
    if (!email) return;

    async function load() {
      try {
        setLoading(true);
        setProfileLoading(true);

        const res = await fetch("/api/dashboard/my-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error("my-services failed:", json);
          setError("Nepavyko užkrauti duomenų.");
          return;
        }

        setServices(json.services ?? []);
        setProviderProfile(json.providerProfile ?? null);
      } catch (e) {
        console.error("my-services request error:", e);
        setError("Serverio klaida.");
      } finally {
        setLoading(false);
        setProfileLoading(false);
      }
    }

    load();
  }, [email]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (!email) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("create service failed:", json);
        setError(json.error || "Nepavyko sukurti paslaugos.");
        return;
      }

      setTitle("");
      setDescription("");
      setCityId("");
      setCategoryId("");
      setPriceFrom("");

      if (email) {
        const refresh = await fetch("/api/dashboard/my-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const refreshedJson = await refresh.json();
        if (refresh.ok) {
          setServices(refreshedJson.services ?? []);
        }
      }
    } catch (e) {
      console.error("create service error:", e);
      setError("Serverio klaida kuriant paslaugą.");
    } finally {
      setCreating(false);
    }
  }

  if (!email || loading || profileLoading) {
    return (
      <main className={styles.container}>
        <p>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Mano paslaugos</h1>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          Atsijungti
        </button>
      </header>

      {error && <p className={styles.errorText}>{error}</p>}

      {!providerProfile && (
        <section className={styles.infoBox}>
          <div className={styles.infoBoxTitle}>
            Kol kas nesate paslaugų teikėjas.
          </div>
          <p>
            Norėdami skelbti paslaugas, pirmiausia užpildykite formą{" "}
            <Link href="/tapti-teikeju" className={styles.infoBoxLink}>
              „Tapti paslaugų teikėju“
            </Link>
            . Paraišką patvirtinus, galėsite kurti ir valdyti savo skelbimus.
          </p>
        </section>
      )}

      {providerProfile && !providerProfile.isApproved && (
        <section className={styles.infoBox}>
          <div className={styles.infoBoxTitle}>
            Jūsų paraiška dar tikrinama.
          </div>
          <p>
            Administratorius peržiūrės jūsų pateiktą informaciją ir patvirtins
            paskyrą. Kai tik tai bus padaryta, čia galėsite kurti ir redaguoti
            savo paslaugas.
          </p>
        </section>
      )}

      {providerProfile && providerProfile.isApproved && (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Sukurti naują paslaugą</h2>

            <form className={styles.form} onSubmit={handleCreateService}>
              <div className={styles.field}>
                <label className={styles.label}>Pavadinimas</label>
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Aprašymas</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Miestas</label>
                  <select
                    className={styles.select}
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                  >
                    <option value="">Neparinkta</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Kategorija</label>
                  <select
                    className={styles.select}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Neparinkta</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Kaina nuo (NOK)</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={creating}
                >
                  {creating ? "Kuriama..." : "Sukurti paslaugą"}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Mano paslaugų sąrašas</h2>

            {services.length === 0 ? (
              <p className={styles.empty}>Dar neturite sukurtų paslaugų.</p>
            ) : (
              <div className={styles.servicesList}>
                {services.map((s) => (
                  <div key={s.id} className={styles.serviceRow}>
                    <div className={styles.serviceMain}>
                      <div className={styles.serviceTitle}>{s.title}</div>
                      <div className={styles.serviceMeta}>
                        {s.city?.name && <span>🏙 {s.city.name}</span>}
                        {s.category?.name && (
                          <span>📂 {s.category.name}</span>
                        )}
                        {s.priceFrom != null && (
                          <span>💰 nuo {s.priceFrom} NOK</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.serviceActions}>
                      <Link
                        href={`/services/${s.slug}`}
                        target="_blank"
                        className={styles.linkButton}
                      >
                        Peržiūrėti
                      </Link>

                      <Link
                        href={`/dashboard/services/${s.id}/edit`}
                        className={styles.linkButtonSecondary}
                      >
                        Redaguoti
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
