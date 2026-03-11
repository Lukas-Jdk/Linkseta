// src/app/[locale]/forgot-password/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "../login/login.module.css";

function mapForgotPasswordError(raw: string | null | undefined) {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return "Nepavyko išsiųsti slaptažodžio atstatymo laiško.";
  }

  if (
    msg.includes("email address is invalid") ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email address")
  ) {
    return "Įvestas neteisingas el. pašto adresas. Patikrinkite ir bandykite dar kartą.";
  }

  if (
    msg.includes("email rate limit exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Per daug bandymų per trumpą laiką. Palaukite kelias minutes ir bandykite dar kartą.";
  }

  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch")
  ) {
    return "Nepavyko susisiekti su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.";
  }

  return `Nepavyko išsiųsti laiško: ${raw}`;
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email.trim()) {
      setError("Įveskite el. paštą.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/${locale}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        console.error("forgot password error:", error);
        setError(mapForgotPasswordError(error.message));
      } else {
        setMessage(
          "Jei toks el. paštas egzistuoja, išsiuntėme slaptažodžio atstatymo nuorodą. Patikrinkite ir „Spam“ aplanką."
        );
      }
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
        <h1 className={styles.title}>Atstatyti slaptažodį</h1>
        <p className={styles.subtitle}>
          Įveskite el. paštą ir išsiųsime slaptažodžio atstatymo nuorodą.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="email"
              placeholder="El. paštas"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Siunčiama..." : "Siųsti nuorodą"}
          </button>
        </form>
      </div>
    </main>
  );
}