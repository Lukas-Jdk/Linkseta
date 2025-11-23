// src/app/dashboard/services/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./services.module.css";

type Service = {
  id: string;
  title: string;
  description: string;
  priceFrom: number | null;
  priceTo: number | null;
  createdAt: string;
};

export default function MyServicesPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // formos state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const userEmail = data.user.email;
      setEmail(userEmail ?? null);

      try {
        const res = await fetch("/api/dashboard/my-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error("my-services failed:", json);
          setError("Nepavyko užkrauti paslaugų.");
        } else {
          setServices(json.services ?? []);
        }
      } catch (err) {
        console.error("my-services request error:", err);
        setError("Serverio klaida.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setFormLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/create-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          title,
          description,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          priceTo: priceTo ? Number(priceTo) : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("create-service failed:", json);
        setError(json.error || "Nepavyko sukurti paslaugos.");
      } else {
        setServices((prev) => [json.service, ...prev]);
        setTitle("");
        setDescription("");
        setPriceFrom("");
        setPriceTo("");
      }
    } catch (err) {
      console.error("create-service request error:", err);
      setError("Serverio klaida.");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <p>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Mano paslaugos</h1>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sukurti naują paslaugą</h2>
        <form className={styles.form} onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Pavadinimas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
          <textarea
            placeholder="Aprašymas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            required
          />
          <div className={styles.row}>
            <input
              type="number"
              placeholder="Kaina nuo (NOK)"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Kaina iki (NOK)"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className={styles.input}
            />
          </div>
          <button
            type="submit"
            className={styles.button}
            disabled={formLoading}
          >
            {formLoading ? "Kuriama..." : "Sukurti paslaugą"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Esamos paslaugos</h2>

        {services.length === 0 ? (
          <p className={styles.text}>Šiuo metu neturi jokių paslaugų.</p>
        ) : (
          <ul className={styles.list}>
            {services.map((service) => (
              <li key={service.id} className={styles.listItem}>
                <div>
                  <div className={styles.serviceTitle}>{service.title}</div>
                  <div className={styles.serviceMeta}>
                    {service.priceFrom != null && (
                      <span>
                        Nuo {service.priceFrom}
                        {service.priceTo != null && ` iki ${service.priceTo}`} NOK
                      </span>
                    )}
                  </div>
                  <p className={styles.serviceDescription}>
                    {service.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
