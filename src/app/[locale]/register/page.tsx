// src/app/[locale]/register/page.tsx
"use client";

import { useState } from "react";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "./register.module.css";
import { User, Phone, Mail, Lock } from "lucide-react";
import { csrfFetch } from "@/lib/csrfClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

function mapRegisterError(raw: string | null | undefined) {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return "Nepavyko užregistruoti paskyros. Bandykite dar kartą.";
  }

  if (
    msg.includes("already registered") ||
    msg.includes("user already registered") ||
    msg.includes("already exists")
  ) {
    return "Toks el. paštas jau naudojamas. Bandykite prisijungti arba atstatyti slaptažodį.";
  }

  if (
    msg.includes("email address is invalid") ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email address")
  ) {
    return "Įvestas neteisingas el. pašto adresas. Patikrinkite ir bandykite dar kartą.";
  }

  if (
    msg.includes("password should be at least") ||
    msg.includes("weak password")
  ) {
    return "Slaptažodis per silpnas. Naudokite bent 8 simbolius, geriausia su raidėmis ir skaičiais.";
  }

  if (
    msg.includes("signup is disabled") ||
    msg.includes("signups not allowed")
  ) {
    return "Registracija šiuo metu laikinai išjungta. Bandykite vėliau.";
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

  return `Registracija nepavyko: ${raw}`;
}

export default function RegisterPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const fullName = [name.trim(), surname.trim()].filter(Boolean).join(" ");

      const emailRedirectTo = `${window.location.origin}/${locale}/auth/confirm?flow=signup-confirmed`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: {
            name: fullName,
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        console.error("register error:", error);
        setError(mapRegisterError(error.message));
        return;
      }

      if (data.session) {
        await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch(() => {});
      }

      setSuccess(
        "Registracija pavyko! Išsiuntėme patvirtinimo laišką. Patikrinkite el. paštą, taip pat „Spam“ ar „Promotions“ skiltis."
      );
      setPassword("");
    } catch (e) {
      console.error("register unexpected error:", e);
      setError("Įvyko serverio klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Registracija</h1>
        <p className={styles.subtitle}>
          Sukurkite naują paskyrą, kad galėtumėte naudotis mūsų paslaugomis ir funkcijomis.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder="Vardas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder="Pavardė"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          <div className={styles.inputRow}>
            <Phone className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder="Telefonas"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className={styles.inputRow}>
            <Mail className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="email"
              placeholder="El. paštas"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputRow}>
            <Lock className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="password"
              placeholder="Slaptažodis"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.hint}>*Slaptažodis turi būti bent 8 simbolių ilgio</div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? "Kuriama..." : "Registruotis"}
          </button>

          <div className={styles.bottomText}>
            Jau turite paskyrą?{" "}
            <LocalizedLink href="/login" className={styles.link}>
              Prisijunkite
            </LocalizedLink>
          </div>

          <div className={styles.legal}>
            Registruodamiesi sutinkate su mūsų{" "}
            <LocalizedLink href="/terms" className={styles.link}>
              Naudojimosi sąlygomis
            </LocalizedLink>{" "}
            ir{" "}
            <LocalizedLink href="/privacy" className={styles.link}>
              Privatumo politika
            </LocalizedLink>
            .
          </div>
        </form>
      </div>
    </main>
  );
}