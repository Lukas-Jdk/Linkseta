// src/app/[locale]/tapti-teikeju/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tapk paslaugų teikėju Norvegijoje | Linkseta",
  description:
    "Tapk paslaugų teikėju Norvegijoje su Linkseta: susikurk profilį, įkelk paslaugas, gauk užklausas ir būk lengvai randamas. Paprastas valdymas ir greitas startas.",
  keywords: [
    "tapti paslaugų teikėju",
    "paslaugų teikėjas norvegijoje",
    "skelbti paslaugas norvegijoje",
    "gauti klientų norvegijoje",
    "meistrai norvegijoje",
    "valymo paslaugos norvegijoje",
    "remontas norvegijoje",
  ],
  openGraph: {
    title: "Tapk paslaugų teikėju Norvegijoje | Linkseta",
    description:
      "Prisijunk prie Linkseta ir tapk paslaugų teikėju Norvegijoje. Sukurk paslaugų skelbimus, gauk užklausas ir augink savo veiklą.",
    url: "https://www.linkseta.com/tapti-teikeju",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Tapk paslaugų teikėju Norvegijoje | Linkseta",
    description:
      "Sukurk paslaugų skelbimus ir būk randamas Norvegijoje: remontas, valymas, statybos, servisas ir daugiau.",
  },
  alternates: {
    canonical: "https://www.linkseta.com/tapti-teikeju",
  },
};

export default function TaptiTeikejuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}