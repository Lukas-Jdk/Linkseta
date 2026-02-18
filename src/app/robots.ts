// src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const locales = routing.locales;

  const allow = locales.flatMap((l) => [
    `/${l}`,
    `/${l}/services`,
    `/${l}/services/`,
    `/${l}/services/*`,
    `/${l}/tapti-teikeju`,
    `/${l}/susisiekite`,
    `/${l}/terms`,
    `/${l}/privacy`,
  ]);

  const disallow = locales.flatMap((l) => [
    `/${l}/login`,
    `/${l}/register`,
    `/${l}/dashboard`,
    `/${l}/admin`,
    `/${l}/api`,
  ]);

  // paprastai API yra be locale, bet jei kažkur turi /api — paslepiam ir taip
  disallow.push("/api");

  return {
    rules: [
      {
        userAgent: "*",
        allow,
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
