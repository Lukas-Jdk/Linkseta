// src/components/provider/ProviderRequestForm.tsx

"use client";

import { FormEvent, useState } from "react";
import styles from "./ProviderRequestForm.module.css";

type Option = {
  id: string;
  name: string;
};

type Props = {
  cities: Option[];
  categories: Option[];
};

export default function ProviderRequestForm({ cities, categories }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email) {
      setError("Vardas ir el. paštas yra privalomi.");
      return;
    }

    setIsSubmitting(true);
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "Įvyko klaida siunčiant paraišką. Bandykite vėliau."
        );
      } else {
        setSuccess("Paraiška sėkmingai išsiųsta! Susisieksime su jumis el. paštu.");
        setName("");
        setEmail("");
        setPhone("");
        setCityId("");
        setCategoryId("");
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą vėliau.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.label}>
          Vardas / įmonės pavadinimas*
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Miestas
          <select
            className={styles.input}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
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
          <select
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
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

      <button
        className={`btn btn-primary ${styles.submitButton}`}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Siunčiama..." : "Siųsti paraišką"}
      </button>
    </form>
  );
}
