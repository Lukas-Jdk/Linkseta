// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  async function fetchRole(email: string | null | undefined) {
    if (!email) {
      setIsAdmin(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setIsAdmin(false);
        return;
      }

      const json = await res.json();
      setIsAdmin(Boolean(json.isAdmin));
    } catch (e) {
      console.error("fetchRole error:", e);
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      setIsLoggedIn(!!session);
      await fetchRole(session?.user?.email ?? null);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      await fetchRole(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setIsLoggedIn(false);
      setIsAdmin(false);
      router.push("/");
    }
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.row}`}>
        <div className={styles.brand}>
          <Link
            href="/"
            aria-label="Linkseta – grįžti į pradžią"
            className={styles.logoLink}
          >
            <Image
              src="/logo.webp"
              alt="Linkseta – paslaugos lietuviams Norvegijoje"
              width={80}
              height={60}
              priority
            />
            <span className={styles.logoText}>Linkseta</span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Pagrindinė navigacija">
          {/* pagrindiniai public linkai */}
          <Link href="/">Pagrindinis</Link>
          <Link href="/services">Paslaugos</Link>
          <Link href="/susisiekite">Susisiekite</Link>

          {/* ADMIN tik adminams */}
          {isAdmin && (
            <Link href="/admin" className={styles.navAuthLink}>
              Admin
            </Link>
          )}

          {/* auth dalis */}
          {!isLoggedIn ? (
            <>
              <Link href="/login" className={styles.navAuthLink}>
                Prisijungti
              </Link>
              <Link href="/register" className={styles.navAuthPrimary}>
                Registracija
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={styles.navAuthLink}>
                Mano paskyra
              </Link>
              <button
                type="button"
                className={styles.navLogoutButton}
                onClick={handleLogout}
              >
                Atsijungti
              </button>
            </>
          )}
        </nav>
      </div>
      <div className={styles.bottomLine} aria-hidden />
    </header>
  );
}
