// src/components/layout/Header.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import Avatar from "@/components/ui/Avatar";

import styles from "./Header.module.css";

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
  const pathname = usePathname();

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

  // Init + auth state listener
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

  // Close menus on route change
  useEffect(() => {
    closeAllMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllMenus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAllMenus]);

  // lock body scroll when drawer open
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

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
    setIsProfileOpen(false);
  }

  return (
    <>
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
              {/* Desktop auth/profile */}
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

              {/* Burger */}
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

      <div className={styles.headerSpacer} aria-hidden="true" />

      {/* MOBILE OVERLAY + DRAWER */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={closeAllMenus} role="presentation">
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.drawerTopRow}>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={closeAllMenus}
                aria-label={tHeader("closeMenu")}
              >
                <span className={styles.drawerCloseX}>×</span>
              </button>
            </div>

            {isLoggedIn ? (
              <div className={styles.drawerProfile}>
                <div className={styles.drawerAvatar}>
                  <Avatar
                    name={userName}
                    email={userEmail}
                    avatarUrl={avatarUrl}
                    size={44}
                    className={styles.drawerAvatarImg}
                  />
                </div>

                <div className={styles.drawerProfileText}>
                  <div className={styles.drawerName}>{userName || userEmail || "—"}</div>
                  {userEmail && <div className={styles.drawerEmail}>{userEmail}</div>}
                  <LocalizedLink href="/dashboard" className={styles.drawerProfileLink} onClick={closeAllMenus}>
                    {tAuth("myAccount")}
                  </LocalizedLink>
                </div>
              </div>
            ) : (
              <div className={styles.drawerAuthBlock}>
                <div className={styles.drawerAuthTitle}>{tAuth("login")}</div>

                <div className={styles.drawerAuthButtons}>
                  <LocalizedLink href="/login" className={styles.drawerPrimaryBtn} onClick={closeAllMenus}>
                    {tAuth("login")}
                  </LocalizedLink>
                  <LocalizedLink href="/register" className={styles.drawerSecondaryBtn} onClick={closeAllMenus}>
                    {tAuth("register")}
                  </LocalizedLink>
                </div>
              </div>
            )}

            <hr className={styles.drawerDivider} />

            <nav className={styles.drawerNav} aria-label={tNav("aria")}>
              <LocalizedLink href="/" className={styles.drawerNavItem} onClick={closeAllMenus}>
                {tNav("home")}
              </LocalizedLink>
              <LocalizedLink href="/services" className={styles.drawerNavItem} onClick={closeAllMenus}>
                {tNav("services")}
              </LocalizedLink>
              <LocalizedLink href="/susisiekite" className={styles.drawerNavItem} onClick={closeAllMenus}>
                {tNav("contact")}
              </LocalizedLink>

              {isAdmin && (
                <LocalizedLink href="/admin" className={styles.drawerNavItem} onClick={closeAllMenus}>
                  {tNav("admin")}
                </LocalizedLink>
              )}
            </nav>

            {isLoggedIn && (
              <div className={styles.drawerSection}>
                <button type="button" className={styles.drawerNavItem} onClick={handleLogout}>
                  {tAuth("logout")}
                </button>
              </div>
            )}

            <div className={styles.drawerFooter}>
              <div>© {new Date().getFullYear()} Linkseta</div>
              <div className={styles.drawerFooterLinks}>
                <LocalizedLink href="/privacy" onClick={closeAllMenus}>
                  Privacy
                </LocalizedLink>
                <span>·</span>
                <LocalizedLink href="/terms" onClick={closeAllMenus}>
                  Terms
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}