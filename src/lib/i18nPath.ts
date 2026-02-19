// src/lib/i18nPath.ts
import { routing } from "@/i18n/routing";

export function isLocale(value: string): boolean {
  return (routing.locales as readonly string[]).includes(value);
}

export function withLocalePath(locale: string, href: string) {
  // external / mailto / tel / hash
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return href;
  }

  const clean = href.startsWith("/") ? href : `/${href}`;

  // jei jau turi /lt /en /no – neliečiam
  const first = clean.split("/")[1];
  if (first && isLocale(first)) return clean;

  // /api nelokalizuojam
  if (clean.startsWith("/api")) return clean;

  const loc = isLocale(locale) ? locale : routing.defaultLocale;
  return `/${loc}${clean === "/" ? "" : clean}`;
}
