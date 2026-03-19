// src/lib/categoryTranslations.ts
export function translateCategoryName(
  slug: string | null | undefined,
  fallbackName: string | null | undefined,
  locale: string,
) {
  const s = (slug ?? "").trim();

  const dict: Record<
    string,
    {
      lt: string;
      en: string;
      no: string;
    }
  > = {
    apskaita: {
      lt: "Apskaita",
      en: "Accounting",
      no: "Regnskap",
    },
    automobiliai: {
      lt: "Automobiliai",
      en: "Cars",
      no: "Bil",
    },
    nt: {
      lt: "NT",
      en: "Real Estate",
      no: "Eiendom",
    },
    statybos: {
      lt: "Statybos",
      en: "Construction",
      no: "Bygg",
    },
    remontas: {
      lt: "Remontas",
      en: "Repairs",
      no: "Reparasjon",
    },
    santechnika: {
      lt: "Santechnika",
      en: "Plumbing",
      no: "Rørlegger",
    },
    elektra: {
      lt: "Elektra",
      en: "Electrical",
      no: "Elektrisk",
    },
    "buitin-technika": {
      lt: "Buitinė technika",
      en: "Home Appliances",
      no: "Hvitevarer",
    },
    transportas: {
      lt: "Transportas",
      en: "Transport",
      no: "Transport",
    },
    valymas: {
      lt: "Valymas",
      en: "Cleaning",
      no: "Rengjøring",
    },
    grois: {
      lt: "Grožis",
      en: "Beauty",
      no: "Skjønnhet",
    },
    sveikata: {
      lt: "Sveikata",
      en: "Health",
      no: "Helse",
    },
    "teisins-paslaugos": {
      lt: "Teisinės paslaugos",
      en: "Legal Services",
      no: "Juridiske tjenester",
    },
    "it-paslaugos": {
      lt: "IT paslaugos",
      en: "IT Services",
      no: "IT-tjenester",
    },
    fotografija: {
      lt: "Fotografija",
      en: "Photography",
      no: "Fotografi",
    },
    mokymai: {
      lt: "Mokymai",
      en: "Training",
      no: "Kurs",
    },
    "vaik-prieira": {
      lt: "Vaikų priežiūra",
      en: "Childcare",
      no: "Barnepass",
    },
    "gyvn-prieira": {
      lt: "Gyvūnų priežiūra",
      en: "Pet Care",
      no: "Dyrepass",
    },
    maistas: {
      lt: "Maistas",
      en: "Food",
      no: "Mat",
    },
    "nam-kis": {
      lt: "Namų ūkis",
      en: "Household",
      no: "Husholdning",
    },
    kita: {
      lt: "Kita",
      en: "Other",
      no: "Annet",
    },
  };

  const entry = dict[s];
  if (!entry) return fallbackName?.trim() || "—";

  if (locale === "en") return entry.en;
  if (locale === "no") return entry.no;
  return entry.lt;
}