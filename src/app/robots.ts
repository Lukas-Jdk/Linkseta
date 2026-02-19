// src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",

        // Leisk indeksuoti tik viešus puslapius (visom kalbom)
        allow: [
          "/lt/",
          "/en/",
          "/no/",
          "/lt/services",
          "/en/services",
          "/no/services",
          "/lt/services/*",
          "/en/services/*",
          "/no/services/*",
          "/lt/tapti-teikeju",
          "/en/tapti-teikeju",
          "/no/tapti-teikeju",
          "/lt/susisiekite",
          "/en/susisiekite",
          "/no/susisiekite",
          "/lt/terms",
          "/en/terms",
          "/no/terms",
          "/lt/privacy",
          "/en/privacy",
          "/no/privacy",
        ],

        // Užrakink auth/admin/api (visom kalbom)
        disallow: [
          "/*/login",
          "/*/register",
          "/*/forgot-password",
          "/*/dashboard",
          "/*/dashboard/*",
          "/*/admin",
          "/*/admin/*",
          "/api",
          "/api/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
