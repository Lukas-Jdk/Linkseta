// src/app/[locale]/privacy/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import styles from "./privacy.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("privacy");

  return (
    <main className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.updated}>{t("updated")}</p>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("whatTitle")}</h2>
          <ul className={styles.ul}>
            <li>{t("what1")}</li>
            <li>{t("what2")}</li>
            <li>{t("what3")}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("whyTitle")}</h2>
          <p className={styles.p}>{t("whyText")}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("cookiesTitle")}</h2>
          <p className={styles.p}>{t("cookiesText")}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("rightsTitle")}</h2>
          <ul className={styles.ul}>
            <li>{t("rights1")}</li>
            <li>{t("rights2")}</li>
            <li>{t("rights3")}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("contactTitle")}</h2>
          <p className={styles.p}>{t("contactText")}</p>
        </section>
      </div>
    </main>
  );
}
