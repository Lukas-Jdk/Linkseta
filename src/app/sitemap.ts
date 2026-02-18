// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = [
  "", // home
  "/services",
  "/tapti-teikeju",
  "/susisiekite",
  "/terms",
  "/privacy",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;

  const services = await prisma.serviceListing.findMany({
    where: { isActive: true, deletedAt: null },
    select: { slug: true, updatedAt: true, createdAt: true },
  });

  const now = new Date();

  // Static routes per locale
  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => {
      const url = `${siteUrl}/${locale}${path}`;
      const isHome = path === "";
      const isServices = path === "/services";

      return {
        url,
        lastModified: now,
        changeFrequency: isHome || isServices ? "daily" : "monthly",
        priority: isHome ? 1 : isServices ? 0.9 : 0.6,
      };
    })
  );

  // Dynamic service routes per locale
  const serviceRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    services.map((s) => ({
      url: `${siteUrl}/${locale}/services/${s.slug}`,
      lastModified: s.updatedAt ?? s.createdAt ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    }))
  );

  return [...staticRoutes, ...serviceRoutes];
}
