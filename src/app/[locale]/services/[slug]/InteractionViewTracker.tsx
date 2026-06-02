// src/app/[locale]/services/[slug]/InteractionViewTracker.tsx
"use client";

import { useEffect } from "react";
import { csrfFetch } from "@/lib/csrfClient";

type Props = {
  serviceId: string;
};

export default function InteractionViewTracker({ serviceId }: Props) {
  useEffect(() => {
    async function trackView() {
      try {
        await csrfFetch("/api/provider-interactions", {
          method: "POST",
          body: JSON.stringify({
            serviceId,
            type: "VIEW",
          }),
        });
      } catch {
        // tracking neturi blokuoti puslapio
      }
    }

    void trackView();
  }, [serviceId]);

  return null;
}