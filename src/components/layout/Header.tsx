// src/components/layout/Header.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "./Header.module.css";
import type { User } from "@supabase/supabase-js";
import { Home, Wrench, MessageCircle, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { csrfFetch } from "@/lib/csrfClient";

type Role = "USER" | "ADMIN" | null;

type MeUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name: string | null;
  avatarUrl: string | null;
};

export default function Header() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const tHeader = useTranslations("header");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");

  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = role === "ADMIN";

  const closeAllMenus = useCallback(() => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }, []);

  const resetAuthUi = useCallback(() => {
    setIsLoggedIn(false);
    setRole(null);
    setUserName(null);
    setUserEmail(null);
    setAvatarUrl(null);
    setIsProfileOpen(false);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as { user: MeUser | null };

      if (json.user) {
        setRole(json.user.role ?? "USER");
        setUserName(json.user.name);
        setUserEmail(json.user.email);
        setAvatarUrl(json.user.avatarUrl);
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, []);

  const applyUserToUi = useCallback(
    (user: User | null) => {
      if (!user) {
        resetAuthUi();
        return;
      }

      setIsLoggedIn(true);
      setUserEmail(user.email ?? null);
    },
    [resetAuthUi],
  );

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      applyUserToUi(data?.user ?? null);

      if (data?.user) {
        await loadMe();
      } else {
        setRole(null);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;

      applyUserToUi(user);

      if (user) {
        await loadMe();
      } else {
        setRole(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUserToUi, loadMe, supabase]);

  async function handleLogout() {
    try {
      await csrfFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      await supabase.auth.signOut().catch(() => null);
    } finally {
      window.location.href = `/${locale}`;
    }
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((v) => !v);
  }

  return (
    <>
      {/* tavo JSX palieku kaip buvo */}
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <div className={styles.brand}>
            <LocalizedLink href="/" aria-label={tHeader("brandAria")} className={styles.logoLink}>
              <Image src="/logo.webp" alt={tHeader("brandAlt")} width={80} height={60} priority />
              <span className={styles.logoText}>Linkseta</span>
            </LocalizedLink>
          </div>

          <div className={styles.right}>
            <nav className={styles.nav} aria-label={tNav("aria")}>
              <div className={styles.navLinks}>
                <LocalizedLink href="/">{tNav("home")}</LocalizedLink>
                <LocalizedLink href="/services">{tNav("services")}</LocalizedLink>
                <LocalizedLink href="/susisiekite">{tNav("contact")}</LocalizedLink>

                {isAdmin && (
                  <LocalizedLink href="/admin" className={styles.adminLink}>
                    {tNav("admin")}
                  </LocalizedLink>
                )}
              </div>
            </nav>

            <div className={styles.iconGroup}>
              {isLoggedIn ? (
                <div className={styles.profileWrapper}>
                  <button
                    type="button"
                    className={styles.profileButton}
                    onClick={() => setIsProfileOpen((v) => !v)}
                    aria-label={tAuth("accountMenuAria")}
                  >
                    <Avatar
                      name={userName}
                      email={userEmail}
                      avatarUrl={avatarUrl}
                      size={36}
                      className={styles.profileAvatar}
                    />
                  </button>

                  {isProfileOpen && (
                    <div className={styles.profileMenu}>
                      <LocalizedLink href="/dashboard" className={styles.profileItem} onClick={closeAllMenus}>
                        {tAuth("myAccount")}
                      </LocalizedLink>

                      <button type="button" className={styles.profileItem} onClick={handleLogout}>
                        {tAuth("logout")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.authDesktop}>
                  <LocalizedLink href="/login" className={`${styles.btn} ${styles.btnOutline}`}>
                    {tAuth("login")}
                  </LocalizedLink>

                  <LocalizedLink href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {tAuth("register")}
                  </LocalizedLink>
                </div>
              )}

              <button
                type="button"
                className={styles.menuToggle}
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? tHeader("closeMenu") : tHeader("openMenu")}
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

      {/* likusi JSX dalis pas tave ok – gali palikti nekeičiant */}
      <div className={styles.headerSpacer} aria-hidden="true" />
    </>
  );
}