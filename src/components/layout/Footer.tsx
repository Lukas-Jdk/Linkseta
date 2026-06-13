// src/components/layout/Footer.tsx
"use client";

import Image from "next/image";
import styles from "./Footer.module.css";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { useTranslations } from "next-intl";
import SupportChatButton from "@/components/chat/SupportChatButton";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
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

          <div className={styles.col}>
            <h3 className={styles.colTitle}>{t("contactTitle")}</h3>

            <p className={styles.smallText}>{t("contactSubtitle")}</p>

            <div className={styles.contactLinks}>
              <SupportChatButton
                className={styles.contactLinkButton}
                label="Chat"
              />

              <span className={styles.separator} aria-hidden="true" />

              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=info@linkseta.com&su=U%C5%BEklausa%20i%C5%A1%20Linkseta"
                className={styles.contactLink}
                aria-label="Email"
                title="Email"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
                  />
                </svg>
                <span>Email</span>
              </a>

              <span className={styles.separator} aria-hidden="true" />

              <a
                href="https://facebook.com/linkseta"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
                aria-label="Facebook"
                title="Facebook"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.9h2.78l-.44 2.91h-2.34V22C18.34 21.25 22 17.08 22 12.06Z"
                  />
                </svg>
                <span>FB</span>
              </a>
            </div>
          </div>
        </div>

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
              Lj<span className={styles.createdBySpan}>D</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
