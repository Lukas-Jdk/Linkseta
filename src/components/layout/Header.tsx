// src/components/layout/Header.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";
import styles from "./Header.module.css";

type Role = "USER" | "ADMIN" | null;

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [profileInitial, setProfileInitial] = useState<string>("N");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ---- AUTH + ROLE per /api/auth/me ----
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        // vienintelis "source of truth": API, kuris jau naudoja Supabase server-side
        const res = await fetch("/api/auth/me", {
          method: "GET",
          // kad nebūtų cache ir visada matytume realią būseną
          cache: "no-store",
        });

        if (!isMounted) return;

        if (!res.ok) {
          // jeigu kažkas ne taip – laikom kaip neprisijungusį
          setIsLoggedIn(false);
          setRole(null);
          setProfileInitial("N");
          return;
        }

        const data: {
          user: { id: string; email: string; role: "USER" | "ADMIN" } | null;
        } = await res.json();

        if (!data.user) {
          // neprisijungęs
          setIsLoggedIn(false);
          setRole(null);
          setProfileInitial("N");
          return;
        }

        // prisijungęs
        setIsLoggedIn(true);
        setRole(data.user.role);

        const email = data.user.email ?? "";
        const initial = email ? email[0].toUpperCase() : "N";
        setProfileInitial(initial);
      } catch (error) {
        console.error("Header auth loadUser error:", error);
        if (!isMounted) return;
        setIsLoggedIn(false);
        setRole(null);
        setProfileInitial("N");
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = role === "ADMIN";

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function closeAllMenus() {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          {/* BRAND / LOGO */}
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

          {/* DEŠINĖ PUSĖ */}
          <div className={styles.right}>
            {/* NAV – DESKTOP */}
            <nav className={styles.nav} aria-label="Pagrindinė navigacija">
              <div className={styles.navLinks}>
                <Link href="/">Pagrindinis</Link>
                <Link href="/services">Paslaugos</Link>
                <Link href="/susisiekite">Susisiekite</Link>
                {isAdmin && (
                  <Link href="/admin" className={styles.adminLink}>
                    Admin
                  </Link>
                )}
              </div>
            </nav>

            {/* IKONOS (tema + profilis / auth + burger) */}
            <div className={styles.iconGroup}>
              <ThemeToggle />

              {isLoggedIn ? (
                <div className={styles.profileWrapper}>
                  <button
                    type="button"
                    className={styles.profileButton}
                    onClick={() => setIsProfileOpen((v) => !v)}
                    aria-label="Atidaryti paskyros meniu"
                  >
                    <span className={styles.profileInitial}>
                      {profileInitial}
                    </span>
                  </button>

                  {isProfileOpen && (
                    <div className={styles.profileMenu}>
                      <Link
                        href="/dashboard"
                        className={styles.profileItem}
                        onClick={closeAllMenus}
                      >
                        Mano paskyra
                      </Link>
                      <button
                        type="button"
                        className={styles.profileItem}
                        onClick={handleLogout}
                      >
                        Atsijungti
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.authDesktop}>
                  <Link
                    href="/login"
                    className={`${styles.btn} ${styles.btnOutline}`}
                  >
                    Prisijungti
                  </Link>
                  <Link
                    href="/register"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    Registracija
                  </Link>
                </div>
              )}

              {/* BURGER – TIK MOBILE */}
              <button
                type="button"
                className={styles.menuToggle}
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={
                  isMobileMenuOpen ? "Uždaryti meniu" : "Atidaryti mobilų meniu"
                }
              >
                {isMobileMenuOpen ? (
                  <span className={styles.menuX}>×</span>
                ) : (
                  <>
                    <span className={styles.menuBar} />
                    <span className={styles.menuBar} />
                    <span className={styles.menuBar} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU – FIXED po headeriu, tik NAV linkai */}
      <div
        className={`${styles.mobileMenu} ${
          isMobileMenuOpen ? styles.mobileMenuOpen : ""
        }`}
      >
        <div className="container">
          <nav className={styles.mobileNav} aria-label="Mobilus meniu">
            <Link href="/" onClick={closeAllMenus}>
              Pagrindinis
            </Link>
            <Link href="/services" onClick={closeAllMenus}>
              Paslaugos
            </Link>
            <Link href="/susisiekite" onClick={closeAllMenus}>
              Susisiekite
            </Link>
            {isAdmin && (
              <Link href="/admin" onClick={closeAllMenus}>
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
