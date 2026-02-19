// src/app/[locale]/services/layout.tsx
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

  const canonical = `${siteUrl}/${locale}/services`;

  return {
    title: t("servicesTitle"),
    description: t("servicesDesc"),
    alternates: {
      canonical,
      languages: {
        lt: `${siteUrl}/lt/services`,
        en: `${siteUrl}/en/services`,
        no: `${siteUrl}/no/services`,
      },
    },
    openGraph: {
      title: t("servicesTitle"),
      description: t("servicesDesc"),
      url: canonical,
      siteName: "Linkseta",
      type: "website",
      images: [
        { url: "/og.png", width: 1200, height: 630, alt: "Linkseta" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("servicesTitle"),
      description: t("servicesDesc"),
      images: ["/og.png"],
    },
  };
}

export default function ServicesLayout({ children }: Props) {
  return <>{children}</>;
}
