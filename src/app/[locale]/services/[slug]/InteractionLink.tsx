// src/app/[locale]/services/[slug]/InteractionLink.tsx
"use client";

import type { ReactNode } from "react";
import { csrfFetch } from "@/lib/csrfClient";

type InteractionType = "VIEW" | "PHONE" | "EMAIL";

type Props = {
  serviceId: string;
  type: InteractionType;
  href: string;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
};

export default function InteractionLink({
  serviceId,
  type,
  href,
  className,
  children,
  target,
  rel,
}: Props) {
  async function trackInteraction() {
    try {
      await csrfFetch("/api/provider-interactions", {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          type,
        }),
      });
    } catch {
      // interaction tracking neturi blokuoti vartotojo veiksmo
    }
  }

  return (
    <a
      className={className}
      href={href}
      target={target}
      rel={rel}
      onClick={() => {
        void trackInteraction();
      }}
    >
      {children}
    </a>
  );
}