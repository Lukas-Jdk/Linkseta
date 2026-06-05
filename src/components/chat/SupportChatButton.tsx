// src/components/chat/SupportChatButton.tsx

"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { csrfFetch } from "@/lib/csrfClient";

type Props = {
  className?: string;
  label?: string;
};

export default function SupportChatButton({
  className,
  label = "Live Chat",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ locale: string }>();

  const locale = params?.locale ?? "lt";

  async function openSupportChat() {
    try {
      const res = await csrfFetch("/api/chat/support/start", {
        method: "POST",
      });

      if (res.status === 401) {
        router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.conversationId) {
        alert(json?.error || "Nepavyko atidaryti chat.");
        return;
      }

      router.push(
        `/${locale}/dashboard/messages?conversation=${json.conversationId}`,
      );
    } catch {
      alert("Serverio klaida.");
    }
  }

  return (
    <button type="button" className={className} onClick={openSupportChat}>
      <MessageCircleMore size={18} />
      {label}
    </button>
  );
}