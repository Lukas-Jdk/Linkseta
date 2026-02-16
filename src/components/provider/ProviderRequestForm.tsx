// src/components/provider/ProviderRequestForm.tsx
"use client";

import { useState } from "react";
import styles from "./ProviderRequestForm.module.css";

export default function ProviderRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");

  //  Honeypot field
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/provider-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          cityId,
          categoryId,
          message,
          website, 
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error || "Nepavyko išsiųsti užklausos.");
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setCityId("");
      setCategoryId("");
      setMessage("");
      setWebsite("");
    } catch (err) {
      console.error(err);
      setError("Serverio klaida.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* 🔒 Honeypot input (nematomas žmonėms) */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
      />

      <div className={styles.field}>
        <label>Vardas *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label>El. paštas *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Telefonas</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>Žinutė</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>Užklausa išsiųsta!</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Siunčiama..." : "Siųsti užklausą"}
      </button>
    </form>
  );
}