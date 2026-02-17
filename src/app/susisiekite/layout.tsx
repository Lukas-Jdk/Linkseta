// src/app/susisiekite/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Susisiekite dėl paslaugų Norvegijoje | Linkseta",
  description:
    "Turite klausimų apie paslaugas Norvegijoje, platformą Linkseta ar norite bendradarbiauti? Susisiekite su mumis el. paštu – padėsime rasti ar pasiūlyti paslaugas.",
  keywords: [
    "susisiekite",
    "kontaktai",
    "paslaugos norvegijoje",
    "paslaugų platforma norvegijoje",
    "linkseta kontaktai",
  ],
  openGraph: {
    title: "Susisiekite dėl paslaugų Norvegijoje | Linkseta",
    description:
      "Parašykite mums, jei ieškote paslaugų Norvegijoje, norite reklamuoti savo veiklą ar turite klausimų apie platformą Linkseta.",
    url: "https://www.linkseta.com/susisiekite",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Susisiekite su Linkseta",
    description:
      "Kontaktai – klausimai apie paslaugas, reklamos galimybes ir bendradarbiavimą Norvegijoje.",
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