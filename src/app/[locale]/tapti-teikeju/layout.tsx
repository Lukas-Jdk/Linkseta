// src/app/[locale]/tapti-teikeju/layout.tsx
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

  const canonical = `${siteUrl}/${locale}/tapti-teikeju`;

  return {
    title: t("becomeTitle"),
    description: t("becomeDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/tapti-teikeju`,
        en: `${siteUrl}/en/tapti-teikeju`,
        no: `${siteUrl}/no/tapti-teikeju`,
      },
    },
    openGraph: {
      title: t("becomeTitle"),
      description: t("becomeDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Linkseta" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("becomeTitle"),
      description: t("becomeDesc"),
      images: ["/og.png"],
    },
  };
}

export default function BecomeProviderLayout({ children }: Props) {
  return <>{children}</>;
}
