// src/app/[locale]/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "./login.module.css";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { Mail, Lock } from "lucide-react";

function mapLoginErrorMessage(raw: string | null | undefined): string {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return "Nepavyko prisijungti. Patikrinkite duomenis ir bandykite dar kartą.";
  }

  if (msg.includes("invalid login credentials")) {
    return "Neteisingas el. paštas arba slaptažodis.";
  }

  if (msg.includes("email not confirmed")) {
    return "El. paštas dar nepatvirtintas. Patikrinkite savo pašto dėžutę.";
  }

  if (
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("over_request_rate_limit")
  ) {
    return "Per daug bandymų prisijungti. Palaukite kelias minutes ir bandykite dar kartą.";
  }

  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch")
  ) {
    return "Nepavyko susisiekti su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.";
  }

  return `Prisijungti nepavyko: ${raw}`;
}

export default function LoginClient() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return `/${locale}/dashboard`;

    if (!next.startsWith("/")) return `/${locale}/dashboard`;
    if (next.startsWith("//")) return `/${locale}/dashboard`;
    if (next.includes("://")) return `/${locale}/dashboard`;
    return next;
  }, [searchParams, locale]);

  const confirmedMessage = useMemo(() => {
    return searchParams.get("confirmed") === "1"
      ? "El. paštas sėkmingai patvirtintas. Dabar galite prisijungti."
      : null;
  }, [searchParams]);

  const confirmErrorMessage = useMemo(() => {
    return searchParams.get("error") === "confirm_failed"
      ? "Nepavyko patvirtinti el. pašto arba nuoroda nebegalioja."
      : null;
  }, [searchParams]);

  const resetMessage = useMemo(() => {
    return searchParams.get("reset") === "1"
      ? "Slaptažodis sėkmingai pakeistas. Dabar galite prisijungti."
      : null;
  }, [searchParams]);

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
      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("login error:", error);
        setError(mapLoginErrorMessage(error.message));
        return;
      }

      router.replace(nextPath);
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

        {confirmedMessage && <p className={styles.success}>{confirmedMessage}</p>}
        {resetMessage && <p className={styles.success}>{resetMessage}</p>}
        {confirmErrorMessage && <p className={styles.error}>{confirmErrorMessage}</p>}
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
            <LocalizedLink href="/forgot-password" className={styles.link}>
              Atstatyti
            </LocalizedLink>
          </p>
        </form>
      </div>
    </main>
  );
}