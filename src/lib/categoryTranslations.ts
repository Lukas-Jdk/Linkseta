// src/lib/categoryTranslations.ts
type Locale = "lt" | "en" | "no";

type CategoryTranslation = {
  lt: string;
  en: string;
  no: string;
};

const CATEGORY_TRANSLATIONS: Record<string, CategoryTranslation> = {
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
  "buitine-technika": {
    lt: "Buitinė technika",
    en: "Home Appliances",
    no: "Hvitevarer",
  },
  elektra: {
    lt: "Elektra",
    en: "Electrical",
    no: "Elektriker",
  },
  fotografija: {
    lt: "Fotografija",
    en: "Photography",
    no: "Fotografi",
  },
  grozis: {
    lt: "Grožis",
    en: "Beauty",
    no: "Skjønnhet",
  },
  "gyvunu-prieziura": {
    lt: "Gyvūnų priežiūra",
    en: "Pet Care",
    no: "Dyrepass",
  },
  "it-paslaugos": {
    lt: "IT paslaugos",
    en: "IT Services",
    no: "IT-tjenester",
  },
  kita: {
    lt: "Kita",
    en: "Other",
    no: "Annet",
  },
  konditerija: {
    lt: "Konditerija",
    en: "Confectionery",
    no: "Konditori",
  },
  maistas: {
    lt: "Maistas",
    en: "Food",
    no: "Mat",
  },
  mityba: {
    lt: "Mityba",
    en: "Nutrition",
    no: "Ernæring",
  },
  mokymai: {
    lt: "Mokymai",
    en: "Training",
    no: "Kurs",
  },
  "namu-ukis": {
    lt: "Namų ūkis",
    en: "Household",
    no: "Husholdning",
  },
  remontas: {
    lt: "Remontas",
    en: "Repairs",
    no: "Reparasjon",
  },
  renginiai: {
    lt: "Renginiai",
    en: "Events",
    no: "Arrangementer",
  },
  santechnika: {
    lt: "Santechnika",
    en: "Plumbing",
    no: "Rørlegger",
  },
  sportas: {
    lt: "Sportas",
    en: "Sports",
    no: "Sport",
  },
  statybos: {
    lt: "Statybos",
    en: "Construction",
    no: "Bygg",
  },
  sveikata: {
    lt: "Sveikata",
    en: "Health",
    no: "Helse",
  },
  "teisines-paslaugos": {
    lt: "Teisinės paslaugos",
    en: "Legal Services",
    no: "Juridiske tjenester",
  },
  transportas: {
    lt: "Transportas",
    en: "Transport",
    no: "Transport",
  },
  "vaiku-prieziura": {
    lt: "Vaikų priežiūra",
    en: "Childcare",
    no: "Barnepass",
  },
  valymas: {
    lt: "Valymas",
    en: "Cleaning",
    no: "Rengjøring",
  },
};

function normalizeCategorySlug(slug: string | null | undefined): string {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase();

  const aliases: Record<string, string> = {
    grois: "grozis",
    "buitin-technika": "buitine-technika",
    "teisins-paslaugos": "teisines-paslaugos",
    "vaik-prieira": "vaiku-prieziura",
    "gyvn-prieira": "gyvunu-prieziura",
    "nam-kis": "namu-ukis",
    "maistas-kateris": "maistas",
    auto: "automobiliai",
    teisine: "teisines-paslaugos",
    nt: "kita",
  };

  return aliases[s] ?? s;
}

export function translateCategoryName(
  slug: string | null | undefined,
  fallbackName: string | null | undefined,
  locale: string,
) {
  const normalizedSlug = normalizeCategorySlug(slug);
  const entry = CATEGORY_TRANSLATIONS[normalizedSlug];

  if (!entry) {
    return fallbackName?.trim() || "—";
  }

  if (locale === "en") return entry.en;
  if (locale === "no") return entry.no;
  return entry.lt;
}