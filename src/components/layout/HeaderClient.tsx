"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
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

type Labels = {
  openMenu: string;
  closeMenu: string;
  accountMenuAria: string;
  login: string;
  register: string;
  myAccount: string;
  logout: string;
  home: string;
  services: string;
  contact: string;
  admin: string;
  navAria: string;
};

type Props = {
  locale: string;
  labels: Labels;
};

export default function HeaderClient({ locale, labels }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
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

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      const user = data?.user ?? null;
      applyUserToUi(user);

      if (user) {
        await loadMe();
      } else {
        setRole(null);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      subscription.unsubscribe();
    };
  }, [applyUserToUi, loadMe, supabase]);

  useEffect(() => {
    closeAllMenus();
  }, [pathname, closeAllMenus]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllMenus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAllMenus]);

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
      <div className={styles.iconGroup}>
        {isLoggedIn ? (
          <div className={styles.profileWrapper}>
            <button
              type="button"
              className={styles.profileButton}
              onClick={() => setIsProfileOpen((v) => !v)}
              aria-label={labels.accountMenuAria}
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
                <Link
                  href={`/${locale}/dashboard`}
                  className={styles.profileItem}
                  onClick={closeAllMenus}
                >
                  {labels.myAccount}
                </Link>

                {isAdmin && (
                  <Link
                    href={`/${locale}/admin`}
                    className={styles.profileItem}
                    onClick={closeAllMenus}
                  >
                    {labels.admin}
                  </Link>
                )}

                <button
                  type="button"
                  className={styles.profileItem}
                  onClick={handleLogout}
                >
                  {labels.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authDesktop}>
            <Link
              href={`/${locale}/login`}
              className={`${styles.btn} ${styles.btnOutline}`}
            >
              {labels.login}
            </Link>

            <Link
              href={`/${locale}/register`}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {labels.register}
            </Link>
          </div>
        )}

        <button
          type="button"
          className={styles.menuToggle}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? labels.closeMenu : labels.openMenu}
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

      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={closeAllMenus}
          role="presentation"
        >
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.drawerTopRow}>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={closeAllMenus}
                aria-label={labels.closeMenu}
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
                  <div className={styles.drawerName}>
                    {userName || userEmail || "—"}
                  </div>
                  {userEmail && (
                    <div className={styles.drawerEmail}>{userEmail}</div>
                  )}
                  <Link
                    href={`/${locale}/dashboard`}
                    className={styles.drawerProfileLink}
                    onClick={closeAllMenus}
                  >
                    {labels.myAccount}
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.drawerAuthBlock}>
                <div className={styles.drawerAuthTitle}>{labels.login}</div>

                <div className={styles.drawerAuthButtons}>
                  <Link
                    href={`/${locale}/login`}
                    className={styles.drawerPrimaryBtn}
                    onClick={closeAllMenus}
                  >
                    {labels.login}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    className={styles.drawerSecondaryBtn}
                    onClick={closeAllMenus}
                  >
                    {labels.register}
                  </Link>
                </div>
              </div>
            )}

            <hr className={styles.drawerDivider} />

            <nav className={styles.drawerNav} aria-label={labels.navAria}>
              <Link
                href={`/${locale}`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                {labels.home}
              </Link>
              <Link
                href={`/${locale}/services`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                {labels.services}
              </Link>
              <Link
                href={`/${locale}/susisiekite`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                {labels.contact}
              </Link>

              {isAdmin && (
                <Link
                  href={`/${locale}/admin`}
                  className={styles.drawerNavItem}
                  onClick={closeAllMenus}
                >
                  {labels.admin}
                </Link>
              )}
            </nav>

            {isLoggedIn && (
              <div className={styles.drawerSection}>
                <button
                  type="button"
                  className={styles.drawerNavItem}
                  onClick={handleLogout}
                >
                  {labels.logout}
                </button>
              </div>
            )}

            <div className={styles.drawerFooter}>
              <div>© {new Date().getFullYear()} Linkseta</div>
              <div className={styles.drawerFooterLinks}>
                <Link href={`/${locale}/privacy`} onClick={closeAllMenus}>
                  Privacy
                </Link>
                <span>·</span>
                <Link href={`/${locale}/terms`} onClick={closeAllMenus}>
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}