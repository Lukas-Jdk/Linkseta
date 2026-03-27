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

async function translateTexts({
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
console.log("🔥 DeepL REQUEST:", {
  texts,
  targetLang,
});
  const res = await fetch(`${getDeeplBaseUrl()}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${getDeeplApiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
console.log("🔥 DeepL REQUEST:", {
  texts,
  targetLang,
});
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`DeepL error: ${res.status} ${errorText}`);
  }

  const json = (await res.json()) as {
    translations?: Array<{ text: string }>;
  };
console.log("🔥 DeepL RESPONSE:", JSON.stringify(json));
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