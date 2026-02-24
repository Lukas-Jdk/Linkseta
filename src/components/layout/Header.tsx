// src/components/layout/Header.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import styles from "./Header.module.css";
import type { User } from "@supabase/supabase-js";
import {
  Home,
  Wrench,
  MessageCircle,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
} from "lucide-react";
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
      // jei /me failina - nerodyk admin
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
    [resetAuthUi]
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

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;

        applyUserToUi(user);

        if (user) {
          await loadMe();
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUserToUi, loadMe]);

  async function handleLogout() {
    try {
      // 1) server-side signOut (išvalo cookies)
      await csrfFetch("/api/auth/logout", { method: "POST" }).catch(() => null);

      // 2) client-side signOut (UI state/cache)
      await supabase.auth.signOut().catch(() => null);
    } finally {
      // 3) redirect į locale home
      window.location.href = `/${locale}`;
    }
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((v) => !v);
  }

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <div className={styles.brand}>
            <LocalizedLink
              href="/"
              aria-label={tHeader("brandAria")}
              className={styles.logoLink}
            >
              <Image
                src="/logo.webp"
                alt={tHeader("brandAlt")}
                width={80}
                height={60}
                priority
              />
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
                      <LocalizedLink
                        href="/dashboard"
                        className={styles.profileItem}
                        onClick={closeAllMenus}
                      >
                        {tAuth("myAccount")}
                      </LocalizedLink>

                      <button
                        type="button"
                        className={styles.profileItem}
                        onClick={handleLogout}
                      >
                        {tAuth("logout")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.authDesktop}>
                  <LocalizedLink
                    href="/login"
                    className={`${styles.btn} ${styles.btnOutline}`}
                  >
                    {tAuth("login")}
                  </LocalizedLink>

                  <LocalizedLink
                    href="/register"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    {tAuth("register")}
                  </LocalizedLink>
                </div>
              )}

              <button
                type="button"
                className={styles.menuToggle}
                onClick={toggleMobileMenu}
                aria-label={
                  isMobileMenuOpen ? tHeader("closeMenu") : tHeader("openMenu")
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

      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={closeAllMenus}
          aria-hidden="true"
        >
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerTopRow} />

            <div className={styles.drawerProfile}>
              {isLoggedIn ? (
                <>
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
                    <div className={styles.drawerName}>
                      {userName || tAuth("signedInUser")}
                    </div>
                    {userEmail && (
                      <div className={styles.drawerEmail}>{userEmail}</div>
                    )}

                    <LocalizedLink
                      href="/dashboard"
                      onClick={closeAllMenus}
                      className={styles.drawerProfileLink}
                    >
                      {tAuth("viewAccount")}
                    </LocalizedLink>
                  </div>
                </>
              ) : (
                <div className={styles.drawerAuthBlock}>
                  <p className={styles.drawerAuthTitle}>{tHeader("welcome")}</p>
                  <div className={styles.drawerAuthButtons}>
                    <LocalizedLink
                      href="/login"
                      onClick={closeAllMenus}
                      className={styles.drawerPrimaryBtn}
                    >
                      {tAuth("login")}
                    </LocalizedLink>
                    <LocalizedLink
                      href="/register"
                      onClick={closeAllMenus}
                      className={styles.drawerSecondaryBtn}
                    >
                      {tAuth("register")}
                    </LocalizedLink>
                  </div>
                </div>
              )}
            </div>

            <hr className={styles.drawerDivider} />

            <nav className={styles.drawerNav} aria-label={tNav("mobileAria")}>
              <LocalizedLink
                href="/"
                onClick={closeAllMenus}
                className={styles.drawerNavItem}
              >
                <Home className={styles.drawerNavIcon} />
                <span>{tNav("home")}</span>
              </LocalizedLink>

              <LocalizedLink
                href="/services"
                onClick={closeAllMenus}
                className={styles.drawerNavItem}
              >
                <Wrench className={styles.drawerNavIcon} />
                <span>{tNav("services")}</span>
              </LocalizedLink>

              <LocalizedLink
                href="/susisiekite"
                onClick={closeAllMenus}
                className={styles.drawerNavItem}
              >
                <MessageCircle className={styles.drawerNavIcon} />
                <span>{tNav("contact")}</span>
              </LocalizedLink>

              {isLoggedIn && (
                <LocalizedLink
                  href="/dashboard"
                  onClick={closeAllMenus}
                  className={styles.drawerNavItem}
                >
                  <LayoutDashboard className={styles.drawerNavIcon} />
                  <span>{tAuth("myAccount")}</span>
                </LocalizedLink>
              )}

              {isAdmin && (
                <LocalizedLink
                  href="/admin"
                  onClick={closeAllMenus}
                  className={styles.drawerNavItem}
                >
                  <ShieldCheck className={styles.drawerNavIcon} />
                  <span>{tNav("admin")}</span>
                </LocalizedLink>
              )}
            </nav>

            <hr className={styles.drawerDivider} />

            {isLoggedIn && (
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>
                  {tAuth("account")}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.drawerNavItem}
                >
                  <LogOut className={styles.drawerNavIcon} />
                  <span>{tAuth("logout")}</span>
                </button>
              </div>
            )}

            <div className={styles.drawerFooter}>
              <span>© {new Date().getFullYear()} Linkseta</span>
              <div className={styles.drawerFooterLinks}>
                <LocalizedLink href="/terms" onClick={closeAllMenus}>
                  {tNav("terms")}
                </LocalizedLink>
                <span>•</span>
                <LocalizedLink href="/privacy" onClick={closeAllMenus}>
                  {tNav("privacy")}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.headerSpacer} aria-hidden="true" />
    </>
  );
}