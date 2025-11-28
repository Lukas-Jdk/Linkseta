/* src/app/layout.tsx */

import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { baseMetadata, siteUrl } from "@/lib/seo";
import { Poppins, Roboto } from "next/font/google";

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

// JSON-LD – Organization + WebSite viename graf'e
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Linkseta",
      url: siteUrl,
      logo: `${siteUrl}/logo.webp`,
      description:
        "Linkseta – platforma lietuviams Norvegijoje, kur gali rasti ir siūlyti paslaugas: statybos, remontas, valymas, automobilių servisas ir daugiau.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "Linkseta",
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/services?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const metadata: Metadata = baseMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lt">
      <head>
        {/* JSON-LD: Organization + WebSite – labai gerai SEO */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </head>
      <body className={`${poppins.variable} ${roboto.variable}`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
