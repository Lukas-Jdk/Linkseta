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

  async function fetchRole() {
    try {
      const res = await fetch("/api/auth/role", {
        method: "GET",
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
      if (session) {
        await fetchRole();
      } else {
        setIsAdmin(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        await fetchRole();
      } else {
        setIsAdmin(false);
      }
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
          <Link href="/">Pagrindinis</Link>
          <Link href="/services">Paslaugos</Link>
          <Link href="/susisiekite">Susisiekite</Link>

          {isAdmin && (
            <Link href="/admin" className={styles.navAuthLink}>
              Admin
            </Link>
          )}

          {!isLoggedIn ? (
            <>
              <Link href="/login" className={styles.navAuthLink}>
                Prisijungti
              </Link>
              <Link
                href="/register"
                className={`btn btn-primary ${styles.navAuthSpacer}`}
              >
                Registracija
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={styles.navAuthLink}
              >
                Mano paskyra
              </Link>
              <button
                type="button"
                className={`btn btn-ghost ${styles.navAuthSpacer}`}
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
