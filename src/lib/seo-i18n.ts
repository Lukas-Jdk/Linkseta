// src/lib/seo-i18n.ts
import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export function localeAlternates(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const languages: Record<string, string> = {};

  for (const l of routing.locales) {
    languages[l] = `${siteUrl}/${l}${clean}`;
  }

  return {
    canonical: `${siteUrl}/lt${clean}`, // default canonical (gali keisti į pagal locale per page)
    languages,
  } satisfies NonNullable<Metadata["alternates"]>;
}

export function absOg(url: string) {
  if (!url) return `${siteUrl}/og.png`;
  if (url.startsWith("http")) return url;
  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
