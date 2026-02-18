// src/app/[locale]/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import styles from "./register.module.css";
import { User, Phone, Mail, Lock } from "lucide-react";

function mapRegisterError(raw: string | null | undefined) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("already registered"))
    return "Toks el. paštas jau naudojamas. Bandykite prisijungti.";
  if (msg.includes("password"))
    return "Slaptažodis per silpnas. Naudokite bent 8 simbolius.";
  return "Nepavyko užregistruoti paskyros. Bandykite dar kartą.";
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, phone } },
      });

      if (error) {
        setError(mapRegisterError(error.message));
        return;
      }

      // jei email confirmation įjungtas — session dažnai bus null (čia ok)
      if (data.session) {
        await fetch("/api/auth/sync-user", { method: "POST" }).catch(() => {});
      }

      setSuccess(
        "Registracija pavyko! Patikrinkite savo el. paštą ir patvirtinkite paskyrą."
      );
      setPassword("");
    } catch (e) {
      console.error(e);
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
              autoComplete="name"
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
            <Link href="/login" className={styles.link}>
              Prisijunkite
            </Link>
          </div>

          <div className={styles.legal}>
            Registruodamiesi sutinkate su mūsų{" "}
            <Link href="/terms" className={styles.link}>
              Naudojimosi sąlygomis
            </Link>{" "}
            ir{" "}
            <Link href="/privacy" className={styles.link}>
              Privatumo politika
            </Link>
            .
          </div>
        </form>
      </div>
    </main>
  );
}
