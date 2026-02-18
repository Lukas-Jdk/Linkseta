// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

const locales = ["lt", "en", "no"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) as Locale | undefined;

  const safeLocale: Locale = locales.includes(locale as any) ? (locale as Locale) : "lt";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});
