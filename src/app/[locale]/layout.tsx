// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  setRequestLocale,
  getTranslations,
} from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { absOg, localeAlternates } from "@/lib/seo-i18n";
import { Poppins, Roboto, Fira_Code } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-primary",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-second",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  const canonical = `${siteUrl}/${locale}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("homeTitle"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("homeDesc"),
    alternates: {
      ...localeAlternates(""),
      canonical,
    },
    openGraph: {
      type: "website",
      url: `https://linkseta.com/${locale}`,
      siteName: t("siteName"),
      title: t("homeTitle"),
      description: t("homeDesc"),
      images: [
        {
          url: absOg("/og-v2.png"),
          width: 1200,
          height: 630,
          alt: t("siteName"),
        },
      ],
      locale: locale === "lt" ? "lt_LT" : locale === "no" ? "nb_NO" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDesc"),
      images: [absOg("/og-v2.png")],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div
      className={`${poppins.variable} ${roboto.variable} ${firaCode.variable} app-shell`}
      data-locale={locale}
    >
      <NextIntlClientProvider messages={messages}>
        <Header locale={locale} />
        <main className="app-main">{children}</main>
        <Footer />
      </NextIntlClientProvider>
    </div>
  );
}