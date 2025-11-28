// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dinaminiai paslaugų puslapiai
  const services = await prisma.serviceListing.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl, // /
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/services`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/tapti-teikeju`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/susisiekite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${siteUrl}/services/${s.slug}`,
    lastModified: s.updatedAt ?? s.createdAt ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
