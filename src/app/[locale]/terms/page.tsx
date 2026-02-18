// src/app/[locale]/terms/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import styles from "./terms.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("terms");

  return (
    <main className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.updated}>{t("updated")}</p>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("introTitle")}</h2>
          <p className={styles.p}>{t("introText")}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("accountTitle")}</h2>
          <ul className={styles.ul}>
            <li>{t("account1")}</li>
            <li>{t("account2")}</li>
            <li>{t("account3")}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("contentTitle")}</h2>
          <ul className={styles.ul}>
            <li>{t("content1")}</li>
            <li>{t("content2")}</li>
            <li>{t("content3")}</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("liabilityTitle")}</h2>
          <p className={styles.p}>{t("liabilityText")}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>{t("contactTitle")}</h2>
          <p className={styles.p}>{t("contactText")}</p>
        </section>
      </div>
    </main>
  );
}
