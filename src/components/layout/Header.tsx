// src/components/layout/Header.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import styles from "./Header.module.css";
import {
  Home,
  Wrench,
  MessageCircle,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

type Role = "USER" | "ADMIN" | null;
type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem("theme", mode);
  } catch {
    // ignore
  }
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;

  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false); // desktop dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // drawer

  // ✅ LINT FIX: tema nusistatoma per initial state, ne per setState useEffect
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());

  // uždedam temą ant <html> (ir išsaugom į localStorage) kai themeMode pasikeičia
  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  // ---- AUTH + ROLE ----
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (!data?.user) {
        setIsLoggedIn(false);
        setRole(null);
        setUserName(null);
        setUserEmail(null);
        setAvatarUrl(null);
        return;
      }

      setIsLoggedIn(true);

      const email = data.user.email ?? "";
      setUserEmail(email || null);

      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;

      const fullName =
        (meta.full_name as string | undefined) ||
        (meta.name as string | undefined) ||
        null;
      setUserName(fullName);

      const avatar =
        (meta.avatar_url as string | undefined) ||
        (meta.picture as string | undefined) ||
        null;
      setAvatarUrl(avatar);

      try {
        const res = await fetch("/api/auth/role");
        if (res.ok) {
          const json = await res.json();
          setRole((json.role as Role) ?? "USER");
        } else {
          setRole("USER");
        }
      } catch {
        setRole("USER");
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = role === "ADMIN";
  const profileImg = avatarUrl || "/avataras.webp";

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function closeAllMenus() {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((v) => !v);
  }

  function handleThemeToggle() {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  }

  function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode);
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
                alt="Linkseta – paslaugos Norvegijoje"
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

            {/* IKONOS / PROFILIS – DESKTOP */}
            <div className={styles.iconGroup}>
              {/* Tema – desktop */}
              <button
                type="button"
                className={styles.themeButton}
                onClick={handleThemeToggle}
                aria-label={
                  themeMode === "light"
                    ? "Perjungti į tamsų režimą"
                    : "Perjungti į šviesų režimą"
                }
              >
                {themeMode === "light" ? (
                  <Sun className={styles.themeIcon} strokeWidth={1.7} />
                ) : (
                  <Moon className={styles.themeIcon} strokeWidth={1.7} />
                )}
              </button>

              {/* Profilis / auth – DESKTOP */}
              {isLoggedIn ? (
                <div className={styles.profileWrapper}>
                  <button
                    type="button"
                    className={styles.profileButton}
                    onClick={() => setIsProfileOpen((v) => !v)}
                    aria-label="Atidaryti paskyros meniu"
                  >
                    <Image
                      src={profileImg}
                      alt="Profilio nuotrauka"
                      width={36}
                      height={36}
                      className={styles.profileAvatar}
                    />
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
                  <Link href="/login" className={`${styles.btn} ${styles.btnOutline}`}>
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
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Uždaryti meniu" : "Atidaryti mobilų meniu"}
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

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={closeAllMenus}
          aria-hidden="true"
        >
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerTopRow}>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={closeAllMenus}
                aria-label="Uždaryti meniu"
              >
                ×
              </button>
            </div>

            {/* PROFILE BLOCK */}
            <div className={styles.drawerProfile}>
              {isLoggedIn ? (
                <>
                  <div className={styles.drawerAvatar}>
                    <Image
                      src={profileImg}
                      alt="Profilio nuotrauka"
                      width={44}
                      height={44}
                      className={styles.drawerAvatarImg}
                    />
                  </div>

                  <div className={styles.drawerProfileText}>
                    <div className={styles.drawerName}>
                      {userName || "Prisijungęs vartotojas"}
                    </div>
                    {userEmail && <div className={styles.drawerEmail}>{userEmail}</div>}
                    <Link
                      href="/dashboard"
                      onClick={closeAllMenus}
                      className={styles.drawerProfileLink}
                    >
                      Peržiūrėti paskyrą
                    </Link>
                  </div>
                </>
              ) : (
                <div className={styles.drawerAuthBlock}>
                  <p className={styles.drawerAuthTitle}>Sveiki atvykę į Linkseta</p>
                  <div className={styles.drawerAuthButtons}>
                    <Link
                      href="/login"
                      onClick={closeAllMenus}
                      className={styles.drawerPrimaryBtn}
                    >
                      Prisijungti
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeAllMenus}
                      className={styles.drawerSecondaryBtn}
                    >
                      Registracija
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <hr className={styles.drawerDivider} />

            {/* MAIN NAV */}
            <nav className={styles.drawerNav} aria-label="Mobilus meniu">
              <Link href="/" onClick={closeAllMenus} className={styles.drawerNavItem}>
                <Home className={styles.drawerNavIcon} />
                <span>Pagrindinis</span>
              </Link>

              <Link
                href="/services"
                onClick={closeAllMenus}
                className={styles.drawerNavItem}
              >
                <Wrench className={styles.drawerNavIcon} />
                <span>Paslaugos</span>
              </Link>

              <Link
                href="/susisiekite"
                onClick={closeAllMenus}
                className={styles.drawerNavItem}
              >
                <MessageCircle className={styles.drawerNavIcon} />
                <span>Susisiekite</span>
              </Link>

              {isLoggedIn && (
                <Link
                  href="/dashboard"
                  onClick={closeAllMenus}
                  className={styles.drawerNavItem}
                >
                  <LayoutDashboard className={styles.drawerNavIcon} />
                  <span>Mano paslaugos</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeAllMenus}
                  className={styles.drawerNavItem}
                >
                  <ShieldCheck className={styles.drawerNavIcon} />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            <hr className={styles.drawerDivider} />

            {/* ACCOUNT / LOGOUT */}
            {isLoggedIn && (
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Paskyra</div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.drawerNavItem}
                >
                  <LogOut className={styles.drawerNavIcon} />
                  <span>Atsijungti</span>
                </button>
              </div>
            )}

            {/* THEME SWITCH (Light/Dark) */}
            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}>Tema</div>
              <div className={styles.themeSegment}>
                <button
                  type="button"
                  className={`${styles.themeOption} ${
                    themeMode === "light" ? styles.themeOptionActive : ""
                  }`}
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun className={styles.themeOptionIcon} strokeWidth={1.6} />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  className={`${styles.themeOption} ${
                    themeMode === "dark" ? styles.themeOptionActive : ""
                  }`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon className={styles.themeOptionIcon} strokeWidth={1.6} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* FOOTER INFO */}
            <div className={styles.drawerFooter}>
              <span>© {new Date().getFullYear()} Linkseta</span>
              <div className={styles.drawerFooterLinks}>
                <Link href="/terms" onClick={closeAllMenus}>
                  Taisyklės
                </Link>
                <span>•</span>
                <Link href="/privacy" onClick={closeAllMenus}>
                  Privatumas
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPACER – kad turinys neužliptų ant fixed headerio */}
      <div className={styles.headerSpacer} aria-hidden="true" />
    </>
  );
}
