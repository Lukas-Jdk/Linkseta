// src/components/layout/HeaderClient.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  plans: string;
  contact: string;
  admin: string;
  navAria: string;
  privacy: string;
  terms: string;
};

type Props = {
  locale: string;
  labels: Labels;
};

type LocaleItem = {
  code: "lt" | "en" | "no";
  short: string;
  flagSrc: string;
  alt: string;
};

const LOCALES: LocaleItem[] = [
  { code: "lt", short: "LT", flagSrc: "/flags/lt.webp", alt: "Lithuanian" },
  { code: "en", short: "EN", flagSrc: "/flags/en.webp", alt: "English" },
  { code: "no", short: "NO", flagSrc: "/flags/no.webp", alt: "Norwegian" },
];

const ME_CACHE_KEY = "linkseta:me:v1";
const ME_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedMe = {
  user: MeUser | null;
  savedAt: number;
};

function readCachedMe(): CachedMe | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ME_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedMe;
    if (!parsed || typeof parsed.savedAt !== "number") return null;

    if (Date.now() - parsed.savedAt > ME_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(ME_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedMe(user: MeUser | null) {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedMe = {
      user,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

function clearCachedMe() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ME_CACHE_KEY);
  } catch {}
}

function buildLocaleHref(
  pathname: string | null,
  currentLocale: string,
  nextLocale: string,
) {
  const currentPath = pathname || `/${currentLocale}`;
  const segments = currentPath.split("/");

  if (segments.length > 1 && segments[1] === currentLocale) {
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return `/${nextLocale}`;
}

export default function HeaderClient({ locale, labels }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocaleOpen, setIsLocaleOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);
  const localeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "ADMIN";

  const activeLocale =
    LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  const otherLocales = LOCALES.filter((item) => item.code !== locale);

  const closeAllMenus = useCallback(() => {
    setIsProfileOpen(false);
    setIsLocaleOpen(false);
    setIsMobileMenuOpen(false);
  }, []);

  const resetAuthUi = useCallback(() => {
    lastUserIdRef.current = null;
    setIsLoggedIn(false);
    setRole(null);
    setUserName(null);
    setUserEmail(null);
    setAvatarUrl(null);
    setIsProfileOpen(false);
    clearCachedMe();
  }, []);

  const applyMeUser = useCallback((user: MeUser | null) => {
    if (!mountedRef.current) return;

    if (!user) {
      setRole(null);
      return;
    }

    setRole(user.role ?? "USER");
    setUserName(user.name);
    setUserEmail(user.email);
    setAvatarUrl(user.avatarUrl);
  }, []);

  const loadMe = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = Boolean(opts?.force);

      if (!force) {
        const cached = readCachedMe();
        if (cached) {
          applyMeUser(cached.user);
          return;
        }
      }

      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (mountedRef.current) setRole(null);
          return;
        }

        const json = (await res.json()) as { user: MeUser | null };

        if (!mountedRef.current) return;

        writeCachedMe(json.user ?? null);
        applyMeUser(json.user ?? null);
      } catch {
        if (!mountedRef.current) return;
        setRole(null);
      }
    },
    [applyMeUser],
  );

  const applyUserToUi = useCallback(
    async (user: User | null, opts?: { forceMe?: boolean }) => {
      if (!user) {
        resetAuthUi();
        return;
      }

      const nextUserId = user.id;
      const email = user.email ?? null;

      setIsLoggedIn(true);
      setUserEmail(email);

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        typeof meta.name === "string" && meta.name.trim()
          ? meta.name.trim()
          : null;
      const metaAvatar =
        typeof meta.avatar_url === "string" && meta.avatar_url.trim()
          ? meta.avatar_url.trim()
          : null;

      setUserName((prev) => metaName ?? prev);
      setAvatarUrl((prev) => metaAvatar ?? prev);

      const shouldForce = Boolean(opts?.forceMe);

      if (lastUserIdRef.current === nextUserId && !shouldForce) {
        return;
      }

      lastUserIdRef.current = nextUserId;
      await loadMe({ force: shouldForce });
    },
    [loadMe, resetAuthUi],
  );

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mountedRef.current) return;
      await applyUserToUi(session?.user ?? null);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetAuthUi();
        return;
      }

      void applyUserToUi(session?.user ?? null, {
        forceMe: event === "SIGNED_IN" || event === "TOKEN_REFRESHED",
      });
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [applyUserToUi, resetAuthUi, supabase]);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsLocaleOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsProfileOpen(false);
        setIsLocaleOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (localeRef.current && !localeRef.current.contains(target)) {
        setIsLocaleOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      clearCachedMe();
      await csrfFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      await supabase.auth.signOut().catch(() => null);
    } finally {
      window.location.href = `/${locale}`;
    }
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((v) => !v);
    setIsProfileOpen(false);
    setIsLocaleOpen(false);
  }

  return (
    <>
      <div className={styles.iconGroup}>
        <div className={styles.localeWrapper} ref={localeRef}>
          <button
            type="button"
            className={styles.localeCurrent}
            onClick={() => {
              setIsLocaleOpen((v) => !v);
              setIsProfileOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={isLocaleOpen}
            aria-label="Select language"
          >
            <span className={styles.localeFlagImageWrap} aria-hidden="true">
              <Image
                src={activeLocale.flagSrc}
                alt=""
                width={18}
                height={18}
                className={styles.localeFlagImage}
              />
            </span>
            <span className={styles.localeCode}>{activeLocale.short}</span>
            <span className={styles.localeChevron} aria-hidden="true">
              ▾
            </span>
          </button>

          {isLocaleOpen && (
            <div className={styles.localeMenu} role="menu">
              {otherLocales.map((item) => (
                <Link
                  key={item.code}
                  href={buildLocaleHref(pathname, locale, item.code)}
                  className={styles.localeMenuItem}
                  role="menuitem"
                  onClick={() => setIsLocaleOpen(false)}
                >
                  <span className={styles.localeFlagImageWrap} aria-hidden="true">
                    <Image
                      src={item.flagSrc}
                      alt=""
                      width={18}
                      height={18}
                      className={styles.localeFlagImage}
                    />
                  </span>
                  <span className={styles.localeCode}>{item.short}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <div className={styles.profileWrapper} ref={profileRef}>
            <button
              type="button"
              className={styles.profileButton}
              onClick={() => {
                setIsProfileOpen((v) => !v);
                setIsLocaleOpen(false);
              }}
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
                href={`/${locale}/tapti-teikeju`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                {labels.plans}
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

            <hr className={styles.drawerDivider} />

            <div className={styles.mobileLocaleBlock}>
              <div className={styles.mobileLocaleTitle}>Language</div>
              <div className={styles.mobileLocaleList}>
                {LOCALES.map((item) => {
                  const isActive = item.code === locale;
                  return (
                    <Link
                      key={item.code}
                      href={buildLocaleHref(pathname, locale, item.code)}
                      className={`${styles.mobileLocaleBtn} ${
                        isActive ? styles.mobileLocaleBtnActive : ""
                      }`}
                      onClick={closeAllMenus}
                    >
                      <span className={styles.localeFlagImageWrap} aria-hidden="true">
                        <Image
                          src={item.flagSrc}
                          alt=""
                          width={18}
                          height={18}
                          className={styles.localeFlagImage}
                        />
                      </span>
                      <span className={styles.localeCode}>{item.short}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <div>© {new Date().getFullYear()} Linkseta</div>
              <div className={styles.drawerFooterLinks}>
                <Link href={`/${locale}/privacy`} onClick={closeAllMenus}>
                  {labels.privacy}
                </Link>
                <span>·</span>
                <Link href={`/${locale}/terms`} onClick={closeAllMenus}>
                  {labels.terms}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}