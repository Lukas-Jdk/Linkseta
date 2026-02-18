// src/app/[locale]/services/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.linkseta.com"),
  title: "Paslaugos Norvegijoje – meistrai, valymas, remontas | Linkseta",
  description:
    "Peržiūrėk paslaugų teikėjų sąrašą Norvegijoje: statybos ir remonto darbai, valymo paslaugos, automobilių remontas, apdaila, santechnika, elektra ir daugiau. Filtruok pagal miestą ir kategoriją.",
  keywords: [
    "paslaugos norvegijoje",
    "meistrai norvegijoje",
    "valymo paslaugos norvegijoje",
    "remontas norvegijoje",
    "statybos darbai norvegijoje",
    "automobiliu remontas norvegijoje",
    "santechnikas norvegija",
    "elektrikas norvegija",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Paslaugos Norvegijoje – meistrai, valymas, remontas | Linkseta",
    description:
      "Vienoje vietoje paslaugų teikėjai Norvegijoje – nuo statybų ir remonto iki valymo ir automobilių serviso. Filtruok pagal miestą ir kategoriją.",
    url: "https://www.linkseta.com/services",
    siteName: "Linkseta",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Linkseta – paslaugos Norvegijoje",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paslaugos Norvegijoje – meistrai, valymas, remontas | Linkseta",
    description:
      "Rask paslaugų teikėjus Norvegijoje pagal miestą ir kategoriją. Aiškūs skelbimai, greita paieška.",
    images: ["/og.jpg"],
  },
  alternates: {
    canonical: "https://www.linkseta.com/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}