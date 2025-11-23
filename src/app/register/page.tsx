"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    alert("Registracija pavyko! Patikrink el. paštą");
    setLoading(false);
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Registracija</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Vardas"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />

        <input
          type="text"
          placeholder="Telefonas"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={styles.input}
        />

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
          {loading ? "Kuriama..." : "Registruotis"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>
    </main>
  );
}
