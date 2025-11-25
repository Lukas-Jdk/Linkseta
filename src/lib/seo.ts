// // src/lib/seo.ts

// import type { Metadata } from "next";

// export const siteUrl = "https://www.linkseta.com";

// export const baseMetadata: Metadata = {
//   metadataBase: new URL(siteUrl),
//   title: "Linkseta – Čia rasi lietuvių paslaugų teikėjus iš Norvegijos",
//   description:
//     "Čia rasi lietuvių paslaugų teikėjus iš Norvegijos – peržiūrėk profilius ir susisiek tiesiogiai.",
//   alternates: { canonical: "/" },
//   openGraph: {
//     type: "website",
//     url: "/",
//     siteName: "Linkseta",
//     title: "Linkseta – Čia rasi lietuvių paslaugų teikėjus iš Norvegijos",
//     description:
//       "Peržiūrėk paslaugų teikėjų profilius ir susisiek tiesiogiai. Lietuviams Norvegijoje.",
//     images: [{ url: "/og.png" }],
//     locale: "lt_NO"
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: "Linkseta",
//     description:
//       "Vieta, kur lietuviai Norvegijoje randa paslaugų teikėjus.",
//     images: ["/og.png"]
//   }
// };

// export function orgJsonLd() {
//   return {
//     "@context": "https://schema.org",
//     "@type": "Organization",
//     name: "Linkseta",
//     url: siteUrl,
//     logo: `${siteUrl}/og.png`
//   };
// }

// export function webSiteJsonLd() {
//   return {
//     "@context": "https://schema.org",
//     "@type": "WebSite",
//     url: siteUrl,
//     name: "Linkseta",
//     potentialAction: {
//       "@type": "SearchAction",
//       target: `${siteUrl}/?q={search_term_string}`,
//       "query-input": "required name=search_term_string"
//     }
//   };
// }
import type { Metadata } from "next";

export const siteUrl = "https://www.linkseta.com";

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Linkseta – Lietuvių paslaugos Norvegijoje",
    template: "%s | Linkseta", // Allows pages to have "Page Name | Linkseta"
  },
  description:
    "Raskite patikimus lietuvių meistrus ir paslaugų teikėjus Norvegijoje. Statyba, grožis, transportas, valymas ir daugiau. Susisiekite tiesiogiai.",
  keywords: [
    "lietuviai norvegijoje",
    "paslaugos norvegijoje",
    "darbas norvegijoje",
    "statybos darbai osle",
    "lietuvių bendruomenė norvegijoje",
    "skelbimai norvegijoje",
    "meistrai norvegijoje",
    "santechnikas osle",
    "kirpeja bergene",
    "automechanikas norvegijoje"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Linkseta",
    title: "Linkseta – Lietuvių paslaugos Norvegijoje",
    description:
      "Didžiausia lietuvių paslaugų teikėjų bazė Norvegijoje. Raskite meistrą savo mieste.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Linkseta" }],
    locale: "lt_LT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkseta – Paslaugos Norvegijoje",
    description: "Lietuvių paslaugų teikėjai Norvegijoje vienoje vietoje.",
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
      // Add your social media links here if you have them
      // "https://facebook.com/linkseta",
      // "https://instagram.com/linkseta"
    ]
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
      "query-input": "required name=search_term_string",
    },
  };
}