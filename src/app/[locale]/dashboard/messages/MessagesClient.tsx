// src/app/[locale]/dashboard/messages/MessagesClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./messages.module.css";

type Conversation = {
  id: string;
  serviceId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  service: {
    title: string | null;
    slug: string | null;
    imageUrl: string | null;
  };
  lastMessage: string | null;
  lastMessageCreatedAt: string | null;
};

type ActiveConversation = {
  id: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  service: {
    title: string | null;
    slug: string | null;
    imageUrl: string | null;
  };
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

type Props = {
  locale: string;
  currentUserId: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: ActiveConversation | null;
  initialMessages: ChatMessage[];
};

function displayName(
  user: { name: string | null; email: string },
  fallback: string,
) {
  return user.name?.trim() || user.email.split("@")[0] || fallback;
}

function initialLetter(user: { name: string | null; email: string }) {
  return (user.name?.trim() || user.email.split("@")[0] || "?")
    .slice(0, 1)
    .toUpperCase();
}

function formatTime(value: string | null, locale: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesClient({
  locale,
  currentUserId,
  conversations,
  activeConversationId,
  activeConversation,
  initialMessages,
}: Props) {
  const router = useRouter();
  const t = useTranslations("messagesPage");

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(!activeConversationId);

  useEffect(() => {
    setMessages(initialMessages);
  }, [activeConversationId, initialMessages]);

  useEffect(() => {
    if (!activeConversationId) return;

    async function markAsRead() {
      try {
        await csrfFetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeConversationId }),
        });

        window.dispatchEvent(new Event("linkseta:chat-read"));
      } catch {
        // ignore
      }
    }

    void markAsRead();
  }, [activeConversationId]);

  const hasConversation = Boolean(activeConversationId && activeConversation);

  const activeName = activeConversation
    ? displayName(activeConversation.otherUser, t("fallbackUser"))
    : "";

  const activeInitial = activeConversation
    ? initialLetter(activeConversation.otherUser)
    : "";

  const cleanText = text.trim();

  const visibleConversations = useMemo(() => conversations, [conversations]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    if (!activeConversationId || cleanText.length < 1 || sending) return;

    setSending(true);

    try {
      const res = await csrfFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content: cleanText,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.message) {
        throw new Error(data?.error || t("sendFailed"));
      }

      setMessages((prev) => [...prev, data.message]);
      setText("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.chatShell}>
      <aside
        className={`${styles.conversationList} ${
          mobileListOpen ? styles.conversationListOpen : ""
        }`}
      >
        <div className={styles.listHeader}>
          <div>
            <h2 className={styles.listTitle}>{t("conversationsTitle")}</h2>
            <p className={styles.listSubtitle}>
              {t("conversationCount", { count: visibleConversations.length })}
            </p>
          </div>
        </div>

        <div className={styles.listItems}>
          {visibleConversations.length === 0 ? (
            <div className={styles.emptyList}>
              <MessageCircle size={28} />
              <strong>{t("emptyListTitle")}</strong>
              <span>{t("emptyListText")}</span>
            </div>
          ) : (
            visibleConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const name = displayName(
                conversation.otherUser,
                t("fallbackUser"),
              );
              const initial = initialLetter(conversation.otherUser);
              const img =
                conversation.otherUser.avatarUrl ||
                conversation.service.imageUrl ||
                null;

              return (
                <Link
                  key={conversation.id}
                  href={`/${locale}/dashboard/messages?conversation=${conversation.id}`}
                  className={`${styles.conversationItem} ${
                    isActive ? styles.conversationItemActive : ""
                  }`}
                  onClick={() => setMobileListOpen(false)}
                >
                  <div className={styles.conversationAvatar}>
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="44px"
                        className={styles.avatarImg}
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <div className={styles.conversationText}>
                    <div className={styles.conversationTop}>
                      <strong>{name}</strong>
                      <span>
                        {formatTime(
                          conversation.lastMessageCreatedAt ||
                            conversation.lastMessageAt ||
                            conversation.createdAt,
                          locale,
                        )}
                      </span>
                    </div>

                    <div className={styles.conversationService}>
                      {conversation.service.title || t("fallbackConversation")}
                    </div>

                    <div className={styles.conversationPreview}>
                      {conversation.lastMessage || t("newConversation")}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      <div className={styles.chatPanel}>
        {hasConversation && activeConversation ? (
          <>
            <header className={styles.chatHeader}>
              <button
                type="button"
                className={styles.backToList}
                onClick={() => setMobileListOpen(true)}
                aria-label={t("backToList")}
              >
                <ArrowLeft size={18} />
              </button>

              <div className={styles.chatAvatar}>
                {activeConversation.otherUser.avatarUrl ? (
                  <Image
                    src={activeConversation.otherUser.avatarUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className={styles.avatarImg}
                  />
                ) : (
                  activeInitial
                )}
              </div>

              <div className={styles.chatHeaderText}>
                <h2>{activeName}</h2>

                {activeConversation.service.slug ? (
                  <Link
                    href={`/${locale}/services/${activeConversation.service.slug}`}
                  >
                    {activeConversation.service.title || t("fallbackService")}
                  </Link>
                ) : (
                  <span>
                    {activeConversation.service.title ||
                      t("fallbackConversation")}
                  </span>
                )}
              </div>
            </header>

            <div className={styles.messagesArea}>
              {messages.length === 0 ? (
                <div className={styles.emptyChat}>
                  <MessageCircle size={36} />
                  <strong>{t("emptyChatTitle")}</strong>
                  <span>{t("emptyChatText")}</span>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageRow} ${
                        mine ? styles.messageRowMine : ""
                      }`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          mine ? styles.messageBubbleMine : ""
                        }`}
                      >
                        <p>{message.content}</p>
                        <span>{formatTime(message.createdAt, locale)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form className={styles.composer} onSubmit={sendMessage}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("inputPlaceholder")}
                maxLength={1000}
                disabled={sending}
              />

              <button
                type="submit"
                disabled={sending || cleanText.length < 1}
                aria-label={t("send")}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className={styles.noConversation}>
            <MessageCircle size={48} />
            <h2>{t("noConversationTitle")}</h2>
            <p>{t("noConversationText")}</p>
          </div>
        )}
      </div>
    </section>
  );
}