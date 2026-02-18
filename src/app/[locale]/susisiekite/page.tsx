// src/app/[locale]/susisiekite/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import styles from "./susisiekite.module.css";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Susisiekite – Linkseta",
  description:
    "Turite klausimų apie Linkseta platformą, paslaugų skelbimus ar bendradarbiavimą? Parašykite mums.",
};

export default function ContactPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <main className={styles.wrapper}>
      {/* reCAPTCHA v3 script (kraunamas tik jei turi siteKey) */}
      {siteKey ? (
        <Script
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
          {/* Kontaktinė informacija */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Kontaktai</h2>
            <p className={styles.text}>
              Kol kas geriausias būdas susisiekti – el. paštu. Vėliau čia atsiras
              ir oficiali užklausų forma.
            </p>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>El. paštas</span>
              <a href="mailto:info@linkseta.com" className={styles.infoValue}>
                info@linkseta.com
              </a>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Socialiniai tinklai</span>
              <span className={styles.infoValue}>
                (bus pridėta vėliau – Facebook / Instagram)
              </span>
            </div>

            <p className={styles.small}>
              Rašydami trumpai aprašykite, ko ieškote – paslaugų, reklamos ar
              bendradarbiavimo. Taip galėsiu atsakyti greičiau ir konkrečiau.
            </p>
          </div>

          {/* Forma – atskiras klientinis komponentas */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Trumpa žinutė</h2>
            <p className={styles.text}>
              Ši forma kol kas niekur nesiunčiama – ji tik paruošta ateičiai.
              Realias užklausas rašykite tiesiai el. paštu.
            </p>

            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}