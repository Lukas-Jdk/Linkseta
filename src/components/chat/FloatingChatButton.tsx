// src/components/chat/FloatingChatButton.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

type Props = {
  locale: string;
};

export default function FloatingChatButton({ locale }: Props) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      setLoggedIn(Boolean(data?.loggedIn));
      setUnread(Number(data?.unread ?? 0));
    } catch {
      setLoggedIn(false);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    void loadUnread();

    const timer = window.setInterval(() => {
      void loadUnread();
    }, 15000);

    function onChatRead() {
      void loadUnread();
    }

    function onFocus() {
      void loadUnread();
    }

    window.addEventListener("linkseta:chat-read", onChatRead);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("linkseta:chat-read", onChatRead);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadUnread]);

  if (!loggedIn) return null;

  return (
    <Link
      href={`/${locale}/dashboard/messages`}
      className="floating-chat-button"
      aria-label="Žinutės"
      title="Žinutės"
    >
      <MessageCircle size={24} />

      <span className="floating-chat-label">Žinutės</span>

      {unread > 0 && (
        <span className="floating-chat-badge">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}