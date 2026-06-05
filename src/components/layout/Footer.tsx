// src/components/layout/Footer.tsx
"use client";

import Image from "next/image";
import styles from "./Footer.module.css";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { useTranslations } from "next-intl";
import { MessageCircleMore } from "lucide-react";
import SupportChatButton from "@/components/chat/SupportChatButton";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
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
                width={58}
                height={44}
                priority={false}
              />

              <span className={styles.logoText}>{tCommon("brand")}</span>
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
                <LocalizedLink className={styles.link} href="/plans">
                  {t("offerServices")}
                </LocalizedLink>
              </li>

              <li>
                <LocalizedLink className={styles.link} href="/contact">
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
            </ul>
          </nav>

          {/* CONTACT */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>{t("contactTitle")}</h3>

            <p className={styles.smallText}>{t("contactSubtitle")}</p>

            <a href="mailto:info@linkseta.com" className={styles.emailText}>
              info@linkseta.com
            </a>

            <SupportChatButton
              className={`${styles.contactButton} ${styles.chatButton}`}
              label="Live Chat"
            />
          </div>
        </div>

        {/* BOTTOM */}
        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} {tCommon("brand")}. {t("rights")}
          </p>

          <p className={styles.copy}>
            {t("createdBy")}{" "}
            <a
              href="https://lukas-juodeikis-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.createdByLink}
            >
              Lj
              <span className={styles.createdBySpan}>D</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
