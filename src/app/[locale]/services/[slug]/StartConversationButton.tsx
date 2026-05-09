// src/app/[locale]/services/[slug]/StartConversationButton.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./slugPage.module.css";

type Props = {
  serviceId: string;
  label: string;
  loadingLabel: string;
};

export default function StartConversationButton({
  serviceId,
  label,
  loadingLabel,
}: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [loading, setLoading] = useState(false);

  async function startChat() {
    setLoading(true);

    try {
      const res = await csrfFetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.conversationId) {
        throw new Error(data?.error || "Nepavyko pradėti pokalbio.");
      }

      router.push(`/${locale}/dashboard/messages?conversation=${data.conversationId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Įvyko klaida.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.primaryBtn}
      onClick={startChat}
      disabled={loading}
    >
      <MessageCircleMore size={18} />
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}