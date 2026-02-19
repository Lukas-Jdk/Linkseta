// src/components/i18n/LocalizedLink.tsx
"use client";

import Link, { LinkProps } from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { routing } from "@/i18n/routing";
import { withLocalePath } from "@/lib/i18nPath";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<LinkProps, "href"> & {
    href: string;
  };

export default function LocalizedLink({ href, ...props }: Props) {
  const params = useParams();
  const raw = params?.locale;
  const locale =
    typeof raw === "string" && raw ? raw : routing.defaultLocale;

  const localizedHref = withLocalePath(locale, href);
  return <Link {...props} href={localizedHref} />;
}
