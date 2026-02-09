// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./register.module.css";
import { User, Phone, Mail, Lock } from "lucide-react";

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("Toks el. paštas jau naudojamas. Bandykite prisijungti.");
        } else {
          setError(error.message || "Nepavyko užregistruoti paskyros.");
        }
        return;
      }

      setSuccess(
        "Registracija pavyko! Patikrinkite el. paštą ir patvirtinkite paskyrą."
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
          Sukurkite naują paskyrą, kad galėtumėte naudotis mūsų paslaugomis ir
          funkcijomis.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <User className={styles.icon} />
            <input
              type="text"
              placeholder="Vardas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputRow}>
            <Phone className={styles.icon} />
            <input
              type="text"
              placeholder="Telefonas"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputRow}>
            <Mail className={styles.icon} />
            <input
              type="email"
              placeholder="El. paštas"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
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
            />
          </div>

          <div className={styles.hint}>
            *Slaptažodis turi būti bent 8 simbolių ilgio
          </div>

          <button className={styles.button} disabled={loading}>
            {loading ? "Kuriama..." : "Registruotis"}
          </button>

          <div className={styles.bottomText}>
            Jau turite paskyrą?{" "}
            <a href="/login" className={styles.link}>
              Prisijunkite
            </a>
          </div>

          <div className={styles.legal}>
            Registruodamiesi sutinkate su mūsų{" "}
            <a href="/terms" className={styles.link}>
              Naudojimosi sąlygomis
            </a>{" "}
            ir{" "}
            <a href="/privacy" className={styles.link}>
              Privatumo politika
            </a>
            .
          </div>
        </form>
      </div>
    </main>
  );
}
