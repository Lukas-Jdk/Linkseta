// src/lib/deepl.ts

type DeeplTargetLang = "EN" | "NB";

type TranslateTextsParams = {
  texts: string[];
  targetLang: DeeplTargetLang;
};

type TranslateServiceContentParams = {
  title: string;
  description: string;
  highlights: string[];
};

type PriceItemInput = {
  label: string;
  priceText?: string | null;
  note?: string | null;
};

function getDeeplApiKey() {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing DEEPL_API_KEY");
  }
  return key;
}

function getDeeplBaseUrl() {
  return (
    process.env.DEEPL_API_BASE_URL?.trim() || "https://api-free.deepl.com"
  );
}

export async function translateTexts({
  texts,
  targetLang,
}: TranslateTextsParams): Promise<string[]> {
  const filtered = texts.map((t) => t.trim());

  if (filtered.length === 0) {
    return [];
  }

  const body = new URLSearchParams();
  body.append("target_lang", targetLang);

  for (const text of filtered) {
    body.append("text", text);
  }

  const res = await fetch(`${getDeeplBaseUrl()}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${getDeeplApiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`DeepL error: ${res.status} ${errorText}`);
  }

  const json = (await res.json()) as {
    translations?: Array<{ text: string }>;
  };

  return Array.isArray(json.translations)
    ? json.translations.map((item) => item.text ?? "")
    : [];
}

export async function translateServiceContent({
  title,
  description,
  highlights,
}: TranslateServiceContentParams) {
  const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean);

  const enTexts = await translateTexts({
    texts: [title, description, ...cleanHighlights],
    targetLang: "EN",
  });

  const noTexts = await translateTexts({
    texts: [title, description, ...cleanHighlights],
    targetLang: "NB",
  });

  return {
    en: {
      title: enTexts[0] ?? title,
      description: enTexts[1] ?? description,
      highlights: enTexts.slice(2),
    },
    no: {
      title: noTexts[0] ?? title,
      description: noTexts[1] ?? description,
      highlights: noTexts.slice(2),
    },
  };
}

export async function translatePriceItems(items: PriceItemInput[]) {
  const cleanItems = items.map((item) => ({
    label: item.label.trim(),
    priceText: item.priceText?.trim() || "",
    note: item.note?.trim() || "",
  }));

  const sourceTexts = cleanItems.flatMap((item) => [
    item.label,
    item.priceText,
    item.note,
  ]);

  if (sourceTexts.length === 0) {
    return {
      en: [] as Array<{ label: string; priceText: string; note: string }>,
      no: [] as Array<{ label: string; priceText: string; note: string }>,
    };
  }

  const [enTexts, noTexts] = await Promise.all([
    translateTexts({
      texts: sourceTexts,
      targetLang: "EN",
    }),
    translateTexts({
      texts: sourceTexts,
      targetLang: "NB",
    }),
  ]);

  const en: Array<{ label: string; priceText: string; note: string }> = [];
  const no: Array<{ label: string; priceText: string; note: string }> = [];

  for (let i = 0; i < cleanItems.length; i += 1) {
    const baseIndex = i * 3;

    en.push({
      label: enTexts[baseIndex] ?? cleanItems[i].label,
      priceText: enTexts[baseIndex + 1] ?? cleanItems[i].priceText,
      note: enTexts[baseIndex + 2] ?? cleanItems[i].note,
    });

    no.push({
      label: noTexts[baseIndex] ?? cleanItems[i].label,
      priceText: noTexts[baseIndex + 1] ?? cleanItems[i].priceText,
      note: noTexts[baseIndex + 2] ?? cleanItems[i].note,
    });
  }

  return { en, no };
}