// src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Ką LEIDŽIAM indeksuoti
        allow: ["/", "/services", "/services/", "/services/*", "/tapti-teikeju", "/susisiekite"],
        // Ką NORIM paslėpti (login, admin ir pan.)
        disallow: [
          "/login",
          "/register",
          "/dashboard",
          "/admin",
          "/api", // API endpointai paieškai nereikalingi
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
