// src/app/tapti-teikeju/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Tapk paslaugų teikėju – lietuvių paslaugos Norvegijoje | Linkseta",
  description:
    "Tapk lietuvių paslaugų teikėju Norvegijoje: pridėk savo paslaugas, gauk naujus klientus ir būk matomas tarp lietuvių bendruomenės. Nemokama registracija, paprastas valdymas.",
  keywords: [
    "tapti paslaugu teikeju",
    "lietuviu paslaugos norvegijoje",
    "lietuviu meistrai norvegijoje",
    "skelbti paslaugas norvegijoje",
    "gauti klientu norvegijoje",
  ],
  openGraph: {
    title:
      "Tapk paslaugų teikėju – lietuvių paslaugos Norvegijoje | Linkseta",
    description:
      "Prisijunk prie Linkseta ir tapk lietuvių paslaugų teikėju Norvegijoje. Paprastai pateik paraišką, įkelk paslaugas ir pasiek lietuvius visoje Norvegijoje.",
    url: "https://www.linkseta.com/tapti-teikeju",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title:
      "Tapk paslaugų teikėju Norvegijoje | Linkseta",
    description:
      "Pildyk paraišką ir tapk lietuvių paslaugų teikėju Norvegijoje – meistrai, remontas, valymas, statybos ir daugiau.",
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
