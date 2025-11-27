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

  // 👇 ar useris jau turi ProviderProfile (t.y. yra teikėjas / pateikė paraišką)
  const [hasProviderProfile, setHasProviderProfile] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    async function loadUser() {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const authUser = data.user;
      const email = authUser.email ?? "";

      let dbUserId: string | undefined = undefined;

      // 1️⃣ Sync į mūsų Prisma User lentelę
      try {
        const res = await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: authUser.user_metadata?.name,
            phone: authUser.user_metadata?.phone,
          }),
        });

        const json = await res.json();
        dbUserId = json.userId ?? undefined;
      } catch (err) {
        console.error("sync-user request error:", err);
      }

      // 2️⃣ Patikrinam, ar jis jau turi ProviderProfile
      try {
        const res = await fetch("/api/dashboard/my-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const json = await res.json();

        if (res.ok && json.providerProfile) {
          setHasProviderProfile(true);
        } else {
          setHasProviderProfile(false);
        }
      } catch (err) {
        console.error("check providerProfile error:", err);
        // jei nepavyko – tiesiog laikom, kad dar nėra
        setHasProviderProfile(false);
      }

      setUser({
        id: authUser.id,
        email,
        dbUserId,
      });

      setLoading(false);
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
        <p>Kraunama.</p>
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
        </p>

        {user?.dbUserId && (
          <p className={styles.meta}>
            DB User ID: <code>{user.dbUserId}</code>
          </p>
        )}

        <div className={styles.actions}>
          {/* Mano paslaugos – visada rodome */}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push("/dashboard/services")}
          >
            Mano paslaugos
          </button>

          {/* Tapti paslaugų teikėju – tik jei DAR nėra ProviderProfile */}
          {hasProviderProfile === false && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push("/tapti-teikeju")}
            >
              Tapti paslaugų teikėju
            </button>
          )}

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
