// src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const locales = routing.locales;

  const allow: string[] = [];
  const disallow: string[] = [];

  for (const locale of locales) {
    allow.push(`/${locale}`);
    allow.push(`/${locale}/`);
    allow.push(`/${locale}/services`);
    allow.push(`/${locale}/services/*`);
    // public static pages
    allow.push(`/${locale}/tapti-teikeju`);
    allow.push(`/${locale}/susisiekite`);
    allow.push(`/${locale}/terms`);
    allow.push(`/${locale}/privacy`);

    // protected pages to block
    disallow.push(`/${locale}/login`);
    disallow.push(`/${locale}/register`);
    disallow.push(`/${locale}/dashboard`);
    disallow.push(`/${locale}/admin`);
  }

  // block API routes
  disallow.push("/api");
  disallow.push("/api/*");

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
