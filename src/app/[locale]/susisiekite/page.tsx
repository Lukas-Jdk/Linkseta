// src/app/[locale]/susisiekite/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import styles from "./susisiekite.module.css";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Susisiekite – Linkseta",
  description:
    "Turite klausimų apie Linkseta platformą, paslaugų skelbimus ar bendradarbiavimą? Parašykite mums.",
};

export default async function ContactPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // ✅ Next 15 – headers() yra async
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <main className={styles.wrapper}>
      {siteKey ? (
        <Script
          nonce={nonce}
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="afterInteractive"
        />
      ) : null}

      <div className={styles.container}>
        <section className={styles.header}>
          <h1 className={styles.title}>Susisiekite</h1>
          <p className={styles.subtitle}>
            Turite klausimų apie platformą, paslaugas ar norite pasiūlyti idėją?
            Parašykite – atsakysiu kuo greičiau.
          </p>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Kontaktai</h2>
            <p className={styles.text}>
              Kol kas geriausias būdas susisiekti – el. paštu.
            </p>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>El. paštas</span>
              <a href="mailto:info@linkseta.com" className={styles.infoValue}>
                info@linkseta.com
              </a>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Trumpa žinutė</h2>
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}