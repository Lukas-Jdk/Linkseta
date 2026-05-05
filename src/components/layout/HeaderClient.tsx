// src/components/layout/HeaderClient.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  BriefcaseBusiness,
  Home,
  LogOut,
  Mail,
  Shield,
  UserRound,
  WalletCards,
} from "lucide-react";

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

type SearchResult = {
  id: string;
  type: "service";
  title: string;
  description: string;
  href: string;
  imageUrl: string | null;
  categoryName: string | null;
  location: string | null;
  priceFrom: number | null;
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

function getSearchText(locale: string) {
  if (locale === "en") {
    return {
      placeholder: "Search services...",
      noResults: "No results found",
      searching: "Searching...",
      viewAll: "View all results",
      priceFrom: "from",
    };
  }

  if (locale === "no") {
    return {
      placeholder: "Søk tjenester...",
      noResults: "Ingen resultater",
      searching: "Søker...",
      viewAll: "Se alle resultater",
      priceFrom: "fra",
    };
  }

  return {
    placeholder: "Ieškoti paslaugų...",
    noResults: "Nieko nerasta",
    searching: "Ieškoma...",
    viewAll: "Rodyti visus rezultatus",
    priceFrom: "nuo",
  };
}

export default function HeaderClient({ locale, labels }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const searchText = getSearchText(locale);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocaleOpen, setIsLocaleOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const mountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);
  const localeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "ADMIN";

  const activeLocale =
    LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  const otherLocales = LOCALES.filter((item) => item.code !== locale);
  const cleanSearchQuery = searchQuery.trim();

  const closeAllMenus = useCallback(() => {
    setIsProfileOpen(false);
    setIsLocaleOpen(false);
    setIsMobileMenuOpen(false);
    setSearchOpen(false);
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

      if (lastUserIdRef.current === nextUserId && !shouldForce) return;

      lastUserIdRef.current = nextUserId;
      await loadMe({ force: shouldForce });
    },
    [loadMe, resetAuthUi],
  );

  function goToSearchPage() {
    const q = searchQuery.trim();
    if (q.length < 2) return;

    closeAllMenus();
    router.push(`/${locale}/services?q=${encodeURIComponent(q)}`);
  }

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
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllMenus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeAllMenus]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }

      if (localeRef.current && !localeRef.current.contains(target)) {
        setIsLocaleOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
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

  useEffect(() => {
    const q = searchQuery.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(
            locale,
          )}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const data = (await res.json().catch(() => null)) as {
          results?: SearchResult[];
        } | null;

        if (!controller.signal.aborted) {
          setSearchResults(Array.isArray(data?.results) ? data.results : []);
          setSearchOpen(true);
        }
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, locale]);

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
    setSearchOpen(false);
  }

  const searchBox = (
    <div className={styles.searchWrapper} ref={searchRef}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon} aria-hidden="true">
          ⌕
        </span>

        <input
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) setSearchOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goToSearchPage();
            }
          }}
          placeholder={searchText.placeholder}
          aria-label={searchText.placeholder}
        />
      </div>

      {searchOpen && cleanSearchQuery.length >= 2 && (
        <div className={styles.searchDropdown}>
          {searchLoading && (
            <div className={styles.searchState}>{searchText.searching}</div>
          )}

          {!searchLoading && searchResults.length === 0 && (
            <div className={styles.searchState}>{searchText.noResults}</div>
          )}

          {!searchLoading &&
            searchResults.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={styles.searchResult}
                onClick={closeAllMenus}
              >
                <div className={styles.searchThumb}>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className={styles.searchThumbImg}
                    />
                  ) : (
                    <span className={styles.searchThumbFallback}>L</span>
                  )}
                </div>

                <div className={styles.searchResultText}>
                  <div className={styles.searchResultTitle}>{item.title}</div>

                  <div className={styles.searchResultMeta}>
                    {[item.categoryName, item.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>

                  <div className={styles.searchResultDesc}>
                    {item.priceFrom
                      ? `${searchText.priceFrom} ${item.priceFrom} NOK · `
                      : ""}
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}

          {!searchLoading && cleanSearchQuery.length >= 2 && (
            <button
              type="button"
              className={styles.searchViewAll}
              onClick={goToSearchPage}
            >
              {searchText.viewAll}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={styles.right}>
        <div className={styles.searchDesktop}>{searchBox}</div>

        <nav className={styles.nav} aria-label={labels.navAria}>
          <div className={styles.navLinks}>
            <Link
              href={`/${locale}`}
              className={styles.navIconLink}
              aria-label={labels.home}
            >
              <Home className={styles.navIcon} />
              <span className={styles.navTooltip}>{labels.home}</span>
            </Link>

            <Link
              href={`/${locale}/services`}
              className={styles.navIconLink}
              aria-label={labels.services}
            >
              <BriefcaseBusiness className={styles.navIcon} />
              <span className={styles.navTooltip}>{labels.services}</span>
            </Link>

            <Link
              href={`/${locale}/tapti-teikeju`}
              className={styles.navIconLink}
              aria-label={labels.plans}
            >
              <WalletCards className={styles.navIcon} />
              <span className={styles.navTooltip}>{labels.plans}</span>
            </Link>

            <Link
              href={`/${locale}/susisiekite`}
              className={styles.navIconLink}
              aria-label={labels.contact}
            >
              <Mail className={styles.navIcon} />
              <span className={styles.navTooltip}>{labels.contact}</span>
            </Link>
          </div>
        </nav>

        <div className={styles.iconGroup}>
          <div className={styles.localeWrapper} ref={localeRef}>
            <button
              type="button"
              className={styles.localeCurrent}
              onClick={() => {
                setIsLocaleOpen((v) => !v);
                setIsProfileOpen(false);
                setSearchOpen(false);
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
                    <span
                      className={styles.localeFlagImageWrap}
                      aria-hidden="true"
                    >
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
                  setSearchOpen(false);
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
                <Home className={styles.drawerNavIcon} />
                {labels.home}
              </Link>

              <Link
                href={`/${locale}/services`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                <BriefcaseBusiness className={styles.drawerNavIcon} />
                {labels.services}
              </Link>

              <Link
                href={`/${locale}/tapti-teikeju`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                <WalletCards className={styles.drawerNavIcon} />
                {labels.plans}
              </Link>

              <Link
                href={`/${locale}/susisiekite`}
                className={styles.drawerNavItem}
                onClick={closeAllMenus}
              >
                <Mail className={styles.drawerNavIcon} />
                {labels.contact}
              </Link>

              {isAdmin && (
                <Link
                  href={`/${locale}/admin`}
                  className={styles.drawerNavItem}
                  onClick={closeAllMenus}
                >
                  <Shield className={styles.drawerNavIcon} />
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
                  <LogOut className={styles.drawerNavIcon} />
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
                      <span
                        className={styles.localeFlagImageWrap}
                        aria-hidden="true"
                      >
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