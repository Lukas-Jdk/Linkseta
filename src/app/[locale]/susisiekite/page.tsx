// src/app/[locale]/susisiekite/page.tsx
import Script from "next/script";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import styles from "./susisiekite.module.css";
import ContactForm from "./ContactForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "contactPage" });
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

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
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("contactsTitle")}</h2>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("emailLabel")}</span>
              <a href="mailto:info@linkseta.com" className={styles.infoValue}>
                info@linkseta.com
              </a>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("shortMessageTitle")}</h2>
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}