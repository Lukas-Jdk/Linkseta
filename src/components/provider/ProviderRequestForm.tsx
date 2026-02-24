// src/components/provider/ProviderRequestForm.tsx
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./ProviderRequestForm.module.css";

type Option = {
  id: string;
  name: string;
};

type Props = {
  cities: Option[];
  categories: Option[];
};

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
      ready: (cb: () => void) => void;
    };
  }
}

export default function ProviderRequestForm({ cities, categories }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");

  // honeypot
  const [website, setWebsite] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function getRecaptchaToken() {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) return null;

    const g = window.grecaptcha;
    if (!g) return null;

    return await new Promise<string | null>((resolve) => {
      g.ready(async () => {
        try {
          const t = await g.execute(siteKey, { action: "provider_request" });
          resolve(t);
        } catch {
          resolve(null);
        }
      });
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // honeypot: jeigu užpildyta - laikom botu, bet atsakom "ok"
    if (website.trim()) {
      setSuccess("Paraiška sėkmingai išsiųsta! Susisieksime su jumis el. paštu.");
      setName("");
      setEmail("");
      setPhone("");
      setCityId("");
      setCategoryId("");
      setMessage("");
      setWebsite("");
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanMsg = message.trim();

    if (!cleanName || !cleanEmail) {
      setError("Vardas ir el. paštas yra privalomi.");
      return;
    }

    setIsSubmitting(true);
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const recaptchaToken = await getRecaptchaToken();
      if (!recaptchaToken) {
        setError(
          "Nepavyko patvirtinti, kad esate žmogus (reCAPTCHA). Perkraukite puslapį ir bandykite dar kartą.",
        );
        return;
      }

      const res = await fetch("/api/provider-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || null,
          cityId: cityId || null,
          categoryId: categoryId || null,
          message: cleanMsg || null,
          website: "", // honeypot neperduodam (arba perduodam tuščią)
          recaptchaToken,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(data?.error || "Įvyko klaida siunčiant paraišką. Bandykite vėliau.");
        return;
      }

      setSuccess("Paraiška sėkmingai išsiųsta! Susisieksime su jumis el. paštu.");
      setName("");
      setEmail("");
      setPhone("");
      setCityId("");
      setCategoryId("");
      setMessage("");
      setWebsite("");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą vėliau.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
      {/* honeypot off-screen */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Vardas / įmonės pavadinimas*
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className={styles.label}>
          El. paštas*
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Telefonas
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <label className={styles.label}>
          Miestas
          <select className={styles.input} value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">Pasirinkti...</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Kategorija
          <select className={styles.input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Pasirinkti...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.label}>
        Papildoma informacija
        <textarea
          className={styles.textarea}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Trumpai aprašykite, kokias paslaugas teikiate."
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <button className={`btn btn-primary ${styles.submitButton}`} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Siunčiama..." : "Siųsti paraišką"}
      </button>
    </form>
  );
}