// src/app/[locale]/susisiekite/layout.tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const siteUrl = "https://www.linkseta.com";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });

  const canonical = `${siteUrl}/${locale}/susisiekite`;

  return {
    title: t("contactTitle"),
    description: t("contactDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/susisiekite`,
        en: `${siteUrl}/en/susisiekite`,
        no: `${siteUrl}/no/susisiekite`,
      },
    },
    openGraph: {
      title: t("contactTitle"),
      description: t("contactDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Linkseta" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("contactTitle"),
      description: t("contactDesc"),
      images: ["/og.png"],
    },
  };
}

export default function ContactLayout({ children }: Props) {
  return <>{children}</>;
}
