// src/components/seo/PaginationLinks.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface PaginationLinksProps {
  locale: string;
  totalPages: number;
  pageNum: number;
}

/**
 * Client component that injects rel="prev" and rel="next" links into the document head
 * This enables proper pagination SEO signals for search engines
 */
export default function PaginationLinks({
  locale,
  totalPages,
  pageNum,
}: PaginationLinksProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Remove any existing prev/next links to avoid duplicates
    const existingPrev = document.querySelector('link[rel="prev"]');
    const existingNext = document.querySelector('link[rel="next"]');
    if (existingPrev) existingPrev.remove();
    if (existingNext) existingNext.remove();

    // Build query string (excluding page param)
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const category = searchParams.get("category");

    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (category) params.set("category", category);

    const queryString = params.toString();
    const baseUrl = `${window.location.protocol}//${window.location.host}/${locale}/services`;

    // Add prev link if not on page 1
    if (pageNum > 1) {
      const prevLink = document.createElement("link");
      prevLink.rel = "prev";
      const prevPageNum = pageNum - 1;
      if (prevPageNum === 1) {
        prevLink.href = `${baseUrl}${queryString ? `?${queryString}` : ""}`;
      } else {
        prevLink.href = `${baseUrl}${queryString ? `?${queryString}&` : "?"}page=${prevPageNum}`;
      }
      document.head.appendChild(prevLink);
    }

    // Add next link if not on last page
    if (pageNum < totalPages) {
      const nextLink = document.createElement("link");
      nextLink.rel = "next";
      nextLink.href = `${baseUrl}${queryString ? `?${queryString}&` : "?"}page=${pageNum + 1}`;
      document.head.appendChild(nextLink);
    }
  }, [locale, pageNum, totalPages, searchParams]);

  // This component doesn't render anything
  return null;
}
