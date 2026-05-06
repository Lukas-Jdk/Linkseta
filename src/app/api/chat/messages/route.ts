// src/app/api/chat/messages/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const conversationId = String(body.conversationId || "").trim();
    const content = String(body.content || "").trim();

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 },
      );
    }

    const participant = await prisma.$queryRaw<
      { id: string }[]
    >`
      select id
      from conversation_participants
      where conversation_id = ${conversationId}
        and user_id = ${authUser.id}
      limit 1
    `;

    if (!participant.length) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const messageId = crypto.randomUUID();

    await prisma.$executeRaw`
      insert into messages (
        id,
        conversation_id,
        sender_id,
        content
      )
      values (
        ${messageId},
        ${conversationId},
        ${authUser.id},
        ${content}
      )
    `;

    await prisma.$executeRaw`
      update conversations
      set last_message_at = now()
      where id = ${conversationId}
    `;

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        conversationId,
        senderId: authUser.id,
        content,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}