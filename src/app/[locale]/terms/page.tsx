// src/app/[locale]/terms/page.tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { absOg } from "@/lib/seo-i18n";
import { siteUrl } from "@/lib/seo";
import styles from "./terms.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const canonical = `${siteUrl}/${locale}/terms`;

  return {
    title: tMeta("termsTitle"),
    description: tMeta("termsDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/terms`,
        en: `${siteUrl}/en/terms`,
        no: `${siteUrl}/no/terms`,
      },
    },
    openGraph: {
      title: tMeta("termsTitle"),
      description: tMeta("termsDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [
        {
          url: absOg("/og.png"),
          width: 1200,
          height: 630,
          alt: "Linkseta",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tMeta("termsTitle"),
      description: tMeta("termsDesc"),
      images: [absOg("/og.png")],
    },
  };
}

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