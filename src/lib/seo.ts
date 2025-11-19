// src/lib/seo.ts

import type { Metadata } from "next";

export const siteUrl = "https://www.linkseta.com";

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Linkseta – Čia rasi lietuvių paslaugų teikėjus iš Norvegijos",
  description:
    "Čia rasi lietuvių paslaugų teikėjus iš Norvegijos – peržiūrėk profilius ir susisiek tiesiogiai.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Linkseta",
    title: "Linkseta – Čia rasi lietuvių paslaugų teikėjus iš Norvegijos",
    description:
      "Peržiūrėk paslaugų teikėjų profilius ir susisiek tiesiogiai. Lietuviams Norvegijoje.",
    images: [{ url: "/og.png" }],
    locale: "lt_NO"
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkseta",
    description:
      "Vieta, kur lietuviai Norvegijoje randa paslaugų teikėjus.",
    images: ["/og.png"]
  }
};

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Linkseta",
    url: siteUrl,
    logo: `${siteUrl}/og.png`
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
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}
