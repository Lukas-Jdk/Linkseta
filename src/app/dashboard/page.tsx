// src/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./dashboard.module.css";

type UserInfo = {
  id: string;        // Supabase user ID
  email: string;
  dbUserId?: string; // Prisma User.id
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      // jei nėra prisijungusio userio -> metam į /login
      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const authUser = data.user;

      try {
        // siunčiam email + meta į mūsų API, kad susikurtų/atsinaujintų Prisma User
        const res = await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authUser.email,
            // jeigu registracijos formoj metadatos nebuvo – šitie gali būti undefined, bet tai ok
            name: authUser.user_metadata?.name,
            phone: authUser.user_metadata?.phone,
          }),
        });

        const json = await res.json();
        console.log("sync-user response:", json); // 👈 čia matysi user iš DB

        if (!res.ok) {
          console.error("sync-user failed:", json);
        }

        setUser({
          id: authUser.id,                       // Supabase ID
          email: authUser.email ?? "",
          dbUserId: json.user?.id ?? json.userId ?? undefined, // Prisma User.id
        });
      } catch (err) {
        console.error("sync-user request error:", err);
        setUser({
          id: authUser.id,
          email: authUser.email ?? "",
        });
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <p>Kraunama...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Mano paskyra</h1>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sveikas sugrįžęs!</h2>

        <p className={styles.text}>
          Prisijungta kaip <strong>{user?.email}</strong>
          {user?.dbUserId && (
            <>
              <br />
              <small>DB User ID: {user.dbUserId}</small>
            </>
          )}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push("/")}
          >
            Į pagrindinį puslapį
          </button>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Atsijungti
          </button>
        </div>
      </section>
    </main>
  );
}
