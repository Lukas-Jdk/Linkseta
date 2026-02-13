// src/app/services/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Paslaugos – lietuvių meistrai ir paslaugų teikėjai Norvegijoje | Linkseta",
  description:
    "Peržiūrėk visą lietuvių paslaugų teikėjų sąrašą Norvegijoje: statybos ir remonto darbai, valymo paslaugos, automobilių remontas, apdaila, santechnika, elektra ir daugiau.",
  keywords: [
    "paslaugos norvegijoje",
    "lietuviu paslaugos norvegijoje",
    "lietuviu meistrai norvegijoje",
    "statybos paslaugos norvegijoje",
    "valymo paslaugos norvegijoje", 
    "automobiliu remontas norvegijoje",
  ],
  openGraph: {
    title:
      "Paslaugos – lietuvių meistrai ir paslaugų teikėjai Norvegijoje | Linkseta",
    description:
      "Vienoje vietoje lietuvių paslaugų teikėjai Norvegijoje – nuo statybų ir remonto iki valymo ir automobilių serviso.",
    url: "https://www.linkseta.com/services",
    siteName: "Linkseta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title:
      "Paslaugos – lietuvių meistrai Norvegijoje | Linkseta",
    description:
      "Rask lietuvių meistrus ir paslaugų teikėjus Norvegijoje pagal miestą ir kategoriją.",
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
