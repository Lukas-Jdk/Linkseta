"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // sėkmingas login → gali nukreipti kur nori (pvz. į /dashboard ar /)
    router.push("/");
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Prisijungimas</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="El. paštas"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <input
          type="password"
          placeholder="Slaptažodis"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />

        <button className={styles.button} disabled={loading}>
          {loading ? "Jungiama..." : "Prisijungti"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>
    </main>
  );
}
