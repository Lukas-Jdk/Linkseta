"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "../login/login.module.css"; // naudosim tą patį stilių

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Įveskite el. paštą");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        setError("Nepavyko išsiųsti laiško. Patikrinkite el. paštą.");
      } else {
        setMessage("Jei toks el. paštas egzistuoja, išsiuntėme slaptažodžio atstatymo nuorodą.");
      }
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>Atstatyti slaptažodį</h1>
        <p className={styles.subtitle}>
          Įveskite el. paštą ir išsiųsime slaptažodžio atstatymo nuorodą.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            El. paštas
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Siunčiama..." : "Siųsti nuorodą"}
          </button>
        </form>
      </div>
    </main>
  );
}
