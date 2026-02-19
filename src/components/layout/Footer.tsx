/* src/components/layout/Footer.tsx */
"use client";

import Image from "next/image";
import styles from "./Footer.module.css";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          {/* BRAND */}
          <div className={styles.brand}>
            <LocalizedLink
              href="/"
              aria-label={t("brandAria")}
              className={styles.brandLink}
            >
              <Image
                src="/logo.webp"
                alt={t("brandAlt")}
                width={64}
                height={48}
                priority={false}
              />
              <span className={styles.logoText}>Linkseta</span>
            </LocalizedLink>

            <p className={styles.brandDesc}>{t("brandDesc")}</p>
          </div>

          {/* NAV */}
          <nav className={styles.col} aria-label={t("navAria")}>
            <h3 className={styles.colTitle}>{t("navTitle")}</h3>
            <ul className={styles.list}>
              <li>
                <LocalizedLink className={styles.link} href="/">
                  {tNav("home")}
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink className={styles.link} href="/services">
                  {tNav("services")}
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink className={styles.link} href="/tapti-teikeju">
                  {t("offerServices")}
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink className={styles.link} href="/susisiekite">
                  {t("about")}
                </LocalizedLink>
              </li>
            </ul>
          </nav>

          {/* LEGAL */}
          <nav className={styles.col} aria-label={t("legalAria")}>
            <h3 className={styles.colTitle}>{t("legalTitle")}</h3>
            <ul className={styles.list}>
              <li>
                <LocalizedLink className={styles.link} href="/terms">
                  {tNav("terms")}
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink className={styles.link} href="/privacy">
                  {tNav("privacy")}
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink className={styles.link} href="/susisiekite">
                  {tNav("contact")}
                </LocalizedLink>
              </li>
            </ul>
          </nav>

          {/* CONTACT */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>{t("contactTitle")}</h3>
            <p className={styles.smallText}>{t("contactSubtitle")}</p>

            <div className={styles.socialRow}>
              <a
                className={styles.iconBtn}
                href="#"
                aria-label="Facebook"
                title="Facebook"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.7c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H7v3h2.6v8h3.9z"
                  />
                </svg>
              </a>

              <a
                className={styles.iconBtn}
                href="mailto:info@linkseta.com"
                aria-label={t("emailAria")}
                title={t("emailTitle")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} Linkseta. {t("rights")}
          </p>

          <p className={styles.copy}>
            {t("createdBy")}{" "}
            <a
              href="https://lukas-juodeikis-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.createdByLink}
            >
              LjD
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
