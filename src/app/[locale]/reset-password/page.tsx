// src/app/[locale]/reset-password/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "../login/login.module.css";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("Slaptažodis turi būti bent 8 simbolių.");
      return;
    }

    if (password !== confirm) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error(error);
        setError("Nepavyko atnaujinti slaptažodžio.");
        return;
      }

      setMessage("Slaptažodis sėkmingai pakeistas. Po kelių sekundžių būsite nukreipti į prisijungimą.");

      setTimeout(() => {
        router.replace(`/${locale}/login?reset=1`);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Naujas slaptažodis</h1>
        <p className={styles.subtitle}>Įveskite naują slaptažodį savo paskyrai.</p>

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="password"
              placeholder="Naujas slaptažodis"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="password"
              placeholder="Pakartokite slaptažodį"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Saugoma..." : "Išsaugoti naują slaptažodį"}
          </button>
        </form>
      </div>
    </main>
  );
}