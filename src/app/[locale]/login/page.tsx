// src/app/[locale]/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./login.module.css";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

function mapLoginErrorMessage(raw: string | null | undefined): string {
  const msg = (raw || "").toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Neteisingas el. pašto ir slaptažodžio derinys.";
  }

  if (msg.includes("email not confirmed")) {
    return "El. paštas dar nepatvirtintas. Patikrinkite savo pašto dėžutę.";
  }

  return "Nepavyko prisijungti. Patikrinkite duomenis ir bandykite dar kartą.";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError("Įveskite el. paštą ir slaptažodį.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("login error:", error);
        setError(mapLoginErrorMessage(error.message));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("login unexpected error:", err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Prisijungimas</h1>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <Mail className={styles.icon} />
            <input
              type="email"
              placeholder="El. paštas"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputRow}>
            <Lock className={styles.icon} />
            <input
              type="password"
              placeholder="Slaptažodis"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? "Jungiama..." : "Prisijungti"}
          </button>

          <p className={styles.helperText}>
            Pamiršote slaptažodį?{" "}
            <Link href="/forgot-password" className={styles.link}>
              Atstatyti
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
