// src/components/layout/Header.tsx
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import HeaderClient from "./HeaderClient";
import styles from "./Header.module.css";

type Props = {
  locale: string;
};

function getPlansLabel(locale: string) {
  if (locale === "en") return "Plans";
  if (locale === "no") return "Planer";
  return "Planai";
}

export default async function Header({ locale }: Props) {
  const [tHeader, tNav, tAuth] = await Promise.all([
    getTranslations({ locale, namespace: "header" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "auth" }),
  ]);

  const plansLabel = getPlansLabel(locale);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.row}`}>
          <div className={styles.brand}>
            <Link
              href={`/${locale}`}
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
            </Link>
          </div>

          <HeaderClient
            locale={locale}
            labels={{
              openMenu: tHeader("openMenu"),
              closeMenu: tHeader("closeMenu"),
              accountMenuAria: tAuth("accountMenuAria"),
              login: tAuth("login"),
              register: tAuth("register"),
              myAccount: tAuth("myAccount"),
              logout: tAuth("logout"),
              home: tNav("home"),
              services: tNav("services"),
              plans: plansLabel,
              contact: tNav("contact"),
              admin: tNav("admin"),
              navAria: tNav("aria"),
              privacy: tNav("privacy"),
              terms: tNav("terms"),
            }}
          />
        </div>
      </header>

      <div className={styles.headerSpacer} aria-hidden="true" />
    </>
  );
}