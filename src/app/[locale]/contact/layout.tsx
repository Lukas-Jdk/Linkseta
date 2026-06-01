// src/app/[locale]/contact/layout.tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { absOg } from "@/lib/seo-i18n";
import { siteUrl } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });
  const canonical = `${siteUrl}/${locale}/contact`;

  return {
    title: t("contactTitle"),
    description: t("contactDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/contact`,
        en: `${siteUrl}/en/contact`,
        no: `${siteUrl}/no/contact`,
      },
    },
    openGraph: {
      title: t("contactTitle"),
      description: t("contactDesc"),
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
      title: t("contactTitle"),
      description: t("contactDesc"),
      images: [absOg("/og-v2.png")],
    },
  };
}

export default function ContactLayout({ children }: Props) {
  return <>{children}</>;
}