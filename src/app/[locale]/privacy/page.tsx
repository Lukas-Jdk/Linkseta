// src/app/[locale]/privacy/page.tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { absOg } from "@/lib/seo-i18n";
import { siteUrl } from "@/lib/seo";
import styles from "./privacy.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const canonical = `${siteUrl}/${locale}/privacy`;

  return {
    title: tMeta("privacyTitle"),
    description: tMeta("privacyDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/privacy`,
        en: `${siteUrl}/en/privacy`,
        no: `${siteUrl}/no/privacy`,
      },
    },
    openGraph: {
      title: tMeta("privacyTitle"),
      description: tMeta("privacyDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [
        {
          url: absOg("/og-v2.png"),
          width: 1200,
          height: 630,
          alt: "Linkseta",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tMeta("privacyTitle"),
      description: tMeta("privacyDesc"),
      images: [absOg("/og-v2.png")],
    },
  };
}

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