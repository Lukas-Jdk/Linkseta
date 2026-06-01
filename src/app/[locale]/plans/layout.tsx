// src/app/[locale]/plans/layout.tsx
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
  const canonical = `${siteUrl}/${locale}/plans`;

  return {
    title: t("becomeTitle"),
    description: t("becomeDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/plans`,
        en: `${siteUrl}/en/plans`,
        no: `${siteUrl}/no/plans`,
      },
    },
    openGraph: {
      title: t("becomeTitle"),
      description: t("becomeDesc"),
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
      title: t("becomeTitle"),
      description: t("becomeDesc"),
      images: [absOg("/og-v2.png")],
    },
  };
}

export default function BecomeProviderLayout({ children }: Props) {
  return <>{children}</>;
}