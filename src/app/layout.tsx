/* src/app/layout.tsx */

import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { baseMetadata, orgJsonLd, webSiteJsonLd } from "@/lib/seo";
import { Poppins, Roboto } from "next/font/google";

const poppins = Poppins ({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-primary"
});

const roboto = Roboto ({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-second"
});

export const metadata: Metadata = baseMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
     <html lang="lt">
      {/* body gauna fontų kintamuosius */}
      <body className={`${poppins.variable} ${roboto.variable}`}>
        <Header />
        <main>{children}</main>
        <Footer />

        {/* JSON-LD: Organization + WebSite – labai gerai SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd())
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd())
          }}
        />
      </body>
    </html>
  );
}
