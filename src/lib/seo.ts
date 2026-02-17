// src/lib/seo.ts
import type { Metadata } from "next";

export const siteUrl = "https://www.linkseta.com";

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Linkseta – Paslaugos Norvegijoje",
    template: "%s | Linkseta",
  },
  description:
    "Raskite patikimus paslaugų teikėjus Norvegijoje: statyba, remontas, valymas, grožis, transportas ir daugiau. Filtruokite pagal miestą ir kategoriją, susisiekite tiesiogiai.",
  keywords: [
    "paslaugos Norvegijoje",
    "meistrai Norvegijoje",
    "remontas Norvegijoje",
    "valymo paslaugos Norvegijoje",
    "santechnikas Norvegijoje",
    "elektrikas Norvegijoje",
    "statybos Norvegijoje",
    "autoservisas Norvegijoje",
    "paslaugų teikėjai Norvegijoje",
    "paslaugos Osle",
    "paslaugos Bergene",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Linkseta",
    title: "Linkseta – Paslaugos Norvegijoje",
    description:
      "Paslaugų katalogas Norvegijoje: raskite teikėją pagal miestą ir kategoriją, susisiekite tiesiogiai.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Linkseta" }],
    locale: "lt_LT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkseta – Paslaugos Norvegijoje",
    description:
      "Raskite paslaugų teikėjus Norvegijoje pagal miestą ir kategoriją.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Linkseta",
    url: siteUrl,
    logo: `${siteUrl}/og.png`,
    sameAs: [
      // pvz.:
      // "https://facebook.com/linkseta",
      // "https://instagram.com/linkseta",
    ],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    name: "Linkseta",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/services?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}