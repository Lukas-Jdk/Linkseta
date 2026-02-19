// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing"; // jei turi routing.locales

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales; // ["lt","en","no"]

  const services = await prisma.serviceListing.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, createdAt: true },
  });

  const now = new Date();

  const staticPaths = [
    "", // home
    "/services",
    "/tapti-teikeju",
    "/susisiekite",
    "/terms",
    "/privacy",
  ];

  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: now,
      changeFrequency:
        path === "" || path === "/services" ? "daily" : "monthly",
      priority:
        path === "" ? 1 : path === "/services" ? 0.9 : 0.6,
    }))
  );

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
