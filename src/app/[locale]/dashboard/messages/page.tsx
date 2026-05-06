// src/app/[locale]/dashboard/messages/page.tsx
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import MessagesClient from "./MessagesClient";
import styles from "./messages.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversation?: string }>;
};

type ConversationRow = {
  id: string;
  service_id: string | null;
  last_message_at: Date | null;
  created_at: Date;
  other_user_id: string;
  other_name: string | null;
  other_email: string;
  other_avatar_url: string | null;
  service_title: string | null;
  service_slug: string | null;
  service_image_url: string | null;
  last_message: string | null;
  last_message_created_at: Date | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  read_at: Date | null;
};

export default async function MessagesPage({ params, searchParams }: Props) {
  const [{ locale }, resolvedSearchParams, authUser] = await Promise.all([
    params,
    searchParams,
    getAuthUser(),
  ]);

  if (!authUser) redirect(`/${locale}/login`);

  setRequestLocale(locale);

  const conversations = await prisma.$queryRaw<ConversationRow[]>`
    select
      c.id,
      c.service_id,
      c.last_message_at,
      c.created_at,

      other_user.id as other_user_id,
      other_user.name as other_name,
      other_user.email as other_email,
      other_user."avatarUrl" as other_avatar_url,

      s.title as service_title,
      s.slug as service_slug,
      s."imageUrl" as service_image_url,

      lm.content as last_message,
      lm.created_at as last_message_created_at

    from conversations c

    join conversation_participants me_participant
      on me_participant.conversation_id = c.id
      and me_participant.user_id = ${authUser.id}

    join conversation_participants other_participant
      on other_participant.conversation_id = c.id
      and other_participant.user_id <> ${authUser.id}

    join "User" other_user
      on other_user.id = other_participant.user_id

    left join "ServiceListing" s
      on s.id = c.service_id

    left join lateral (
      select m.content, m.created_at
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) lm on true

    order by coalesce(c.last_message_at, c.created_at) desc
  `;

  const activeConversationId =
    resolvedSearchParams.conversation ||
    conversations[0]?.id ||
    null;

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) ?? null
    : null;

  const messages = activeConversationId
    ? await prisma.$queryRaw<MessageRow[]>`
        select
          m.id,
          m.conversation_id,
          m.sender_id,
          m.content,
          m.created_at,
          m.read_at
        from messages m
        where m.conversation_id = ${activeConversationId}
          and exists (
            select 1
            from conversation_participants cp
            where cp.conversation_id = m.conversation_id
              and cp.user_id = ${authUser.id}
          )
        order by m.created_at asc
      `
    : [];

  return (
    <main className={styles.page}>
      <div className="container">
        <section className={styles.topCard}>
          <div>
            <h1 className={styles.title}>Žinutės</h1>
            <p className={styles.subtitle}>
              Bendraukite su klientais ir paslaugų teikėjais vienoje vietoje.
            </p>
          </div>
        </section>

        <MessagesClient
          locale={locale}
          currentUserId={authUser.id}
          conversations={conversations.map((c) => ({
            id: c.id,
            serviceId: c.service_id,
            lastMessageAt: c.last_message_at?.toISOString() ?? null,
            createdAt: c.created_at.toISOString(),
            otherUser: {
              id: c.other_user_id,
              name: c.other_name,
              email: c.other_email,
              avatarUrl: c.other_avatar_url,
            },
            service: {
              title: c.service_title,
              slug: c.service_slug,
              imageUrl: c.service_image_url,
            },
            lastMessage: c.last_message,
            lastMessageCreatedAt:
              c.last_message_created_at?.toISOString() ?? null,
          }))}
          activeConversationId={activeConversationId}
          activeConversation={
            activeConversation
              ? {
                  id: activeConversation.id,
                  otherUser: {
                    id: activeConversation.other_user_id,
                    name: activeConversation.other_name,
                    email: activeConversation.other_email,
                    avatarUrl: activeConversation.other_avatar_url,
                  },
                  service: {
                    title: activeConversation.service_title,
                    slug: activeConversation.service_slug,
                    imageUrl: activeConversation.service_image_url,
                  },
                }
              : null
          }
          initialMessages={messages.map((m) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content,
            createdAt: m.created_at.toISOString(),
            readAt: m.read_at?.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}