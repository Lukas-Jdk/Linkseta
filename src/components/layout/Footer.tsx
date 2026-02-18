/* src/components/layout/Footer.tsx */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  const params = useParams();
  const locale =
    typeof params?.locale === "string" && params.locale ? params.locale : "lt";

  const href = (path: string) => {
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `/${locale}${clean}`;
  };

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          {/* BRAND */}
          <div className={styles.brand}>
            <Link
              href={href("/")}
              aria-label="Linkseta – grįžti į pradžią"
              className={styles.brandLink}
            >
              <Image
                src="/logo.webp"
                alt="Linkseta – paslaugos Norvegijoje"
                width={64}
                height={48}
                priority={false}
              />
              <span className={styles.logoText}>Linkseta</span>
            </Link>

            <p className={styles.brandDesc}>
              Jūsų patikimas tiltas tarp klientų ir specialistų Norvegijoje.
            </p>
          </div>

          {/* NAV */}
          <nav className={styles.col} aria-label="Navigacija">
            <h3 className={styles.colTitle}>Navigacija</h3>
            <ul className={styles.list}>
              <li>
                <Link className={styles.link} href={href("/")}>
                  Pagrindinis
                </Link>
              </li>
              <li>
                <Link className={styles.link} href={href("/services")}>
                  Paslaugos
                </Link>
              </li>
              <li>
                <Link className={styles.link} href={href("/tapti-teikeju")}>
                  Pasiūlyti paslaugas
                </Link>
              </li>
              <li>
                <Link className={styles.link} href={href("/susisiekite")}>
                  Apie mus
                </Link>
              </li>
            </ul>
          </nav>

          {/* LEGAL */}
          <nav className={styles.col} aria-label="Teisinė informacija">
            <h3 className={styles.colTitle}>Teisinė informacija</h3>
            <ul className={styles.list}>
              <li>
                <Link className={styles.link} href={href("/terms")}>
                  Naudojimosi sąlygos
                </Link>
              </li>
              <li>
                <Link className={styles.link} href={href("/privacy")}>
                  Privatumo politika
                </Link>
              </li>
              <li>
                <Link className={styles.link} href={href("/susisiekite")}>
                  Kontaktai
                </Link>
              </li>
            </ul>
          </nav>

          {/* CONTACT */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Susisiekite</h3>
            <p className={styles.smallText}>Klausimai ar pasiūlymai?</p>

            <div className={styles.socialRow}>
              {/* Facebook (placeholder) */}
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

              {/* Email */}
              <a
                className={styles.iconBtn}
                href="mailto:info@linkseta.com"
                aria-label="El. paštas"
                title="El. paštas"
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
          <p className={styles.copy}>© {new Date().getFullYear()} Linkseta. Visos teisės saugomos.</p>

          <p className={styles.copy}>
            Created by{" "}
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
