// src/app/susisiekite/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Susisiekite dėl lietuvių paslaugų Norvegijoje | Linkseta",
  description:
    "Turite klausimų apie lietuvių paslaugas Norvegijoje, platformą Linkseta ar norite bendradarbiauti? Susisiekite el. paštu – padėsime rasti ar pasiūlyti paslaugas.",
  keywords: [
    "susisiekite",
    "kontaktai",
    "lietuviu paslaugos norvegijoje",
    "klausimai apie paslaugas norvegijoje",
    "linkseta kontaktai",
  ],
  openGraph: {
    title: "Susisiekite dėl paslaugų Norvegijoje | Linkseta",
    description:
      "Parašykite mums, jei ieškote lietuvių paslaugų Norvegijoje, norite reklamuoti savo paslaugas ar turite klausimų apie platformą Linkseta.",
    url: "https://www.linkseta.com/susisiekite",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Susisiekite su Linkseta",
    description:
      "Kontaktai lietuviams Norvegijoje – klausimai apie paslaugas, reklamos galimybes ir bendradarbiavimą.",
  },
  alternates: {
    canonical: "https://www.linkseta.com/susisiekite",
  },
};

export default function SusisiekiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
