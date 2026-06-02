// src/app/api/services/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { Prisma, ProviderInteractionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCsrf } from "@/lib/csrf";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { logError, newRequestId } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/planAccess";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const MIN_COMMENT_LENGTH = 20;

type ReviewErrorCode =
  | "LOGIN_REQUIRED"
  | "INVALID_RATING"
  | "TOO_SHORT"
  | "SERVICE_NOT_FOUND"
  | "OWN_SERVICE"
  | "USER_NOT_FOUND"
  | "ACCOUNT_TOO_NEW"
  | "CHAT_REQUIRED"
  | "INTERACTION_REQUIRED"
  | "WAIT_24H"
  | "ALREADY_EXISTS"
  | "SERVER_ERROR";

function errorJson(code: ReviewErrorCode, status: number, meta?: Record<string, unknown>) {
  return NextResponse.json({ errorCode: code, ...meta }, { status });
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanRating(value: unknown) {
  const num = Number(value);
  if (!Number.isInteger(num)) return null;
  if (num < 1 || num > 5) return null;
  return num;
}

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(`review:${ip}`).digest("hex");
}

function daysSince(date: Date) {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const user = await getAuthUser();

    if (!user) {
      return errorJson("LOGIN_REQUIRED", 401);
    }

    await rateLimitOrThrow({
      key: `review:create:${ip}:${user.id}`,
      limit: 3,
      windowMs: 60_000,
    });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const rating = cleanRating(body?.rating);
    const comment = cleanText(body?.comment, 1000);

    if (!rating) {
      return errorJson("INVALID_RATING", 400);
    }

    if (comment.length < MIN_COMMENT_LENGTH) {
      return errorJson("TOO_SHORT", 400, { min: MIN_COMMENT_LENGTH });
    }

    const service = await prisma.serviceListing.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            profile: {
              select: {
                lifetimeFree: true,
                trialEndsAt: true,
                stripeSubscriptionId: true,
                subscriptionStatus: true,
                plan: {
                  select: {
                    slug: true,
                    isTrial: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!service) {
      return errorJson("SERVICE_NOT_FOUND", 404);
    }

    if (service.userId === user.id) {
      return errorJson("OWN_SERVICE", 400);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return errorJson("USER_NOT_FOUND", 401);
    }

    const accountCanReviewAt = new Date(
      dbUser.createdAt.getTime() + ACCOUNT_MIN_AGE_MS,
    );

    if (Date.now() < accountCanReviewAt.getTime()) {
      return errorJson("ACCOUNT_TOO_NEW", 403);
    }

    const providerHasChat = hasPremiumAccess(service.user.profile);

    const allowedInteractionTypes: ProviderInteractionType[] = providerHasChat
      ? [ProviderInteractionType.CHAT]
      : [
          ProviderInteractionType.VIEW,
          ProviderInteractionType.PHONE,
          ProviderInteractionType.EMAIL,
        ];

    const interaction = await prisma.providerInteraction.findFirst({
      where: {
        serviceId: service.id,
        providerId: service.userId,
        userId: user.id,
        type: {
          in: allowedInteractionTypes,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
      },
    });

    if (!interaction) {
      return errorJson(
        providerHasChat ? "CHAT_REQUIRED" : "INTERACTION_REQUIRED",
        403,
      );
    }

    const canReviewAt = new Date(
      interaction.createdAt.getTime() + REVIEW_DELAY_MS,
    );

    if (Date.now() < canReviewAt.getTime()) {
      return errorJson("WAIT_24H", 403);
    }

    const userAgeDays = daysSince(dbUser.createdAt);

    const totalUserMessages = await prisma.message.count({
      where: { senderId: user.id },
    });

    const totalUserConversations = await prisma.conversation.count({
      where: { createdBy: user.id },
    });

    const totalUserInteractions = await prisma.providerInteraction.count({
      where: { userId: user.id },
    });

    let suspicionScore = 0;

    if (userAgeDays < 3) suspicionScore += 30;
    if (userAgeDays < 1) suspicionScore += 25;
    if (totalUserInteractions <= 1) suspicionScore += 20;
    if (providerHasChat && totalUserMessages <= 1) suspicionScore += 20;
    if (providerHasChat && totalUserConversations <= 1) suspicionScore += 15;
    if (rating === 5) suspicionScore += 10;
    if (comment.length < 80) suspicionScore += 10;

    const isSuspicious = suspicionScore >= 60;

    let weight = 1.0;

    if (userAgeDays < 7) weight = 0.35;
    if (userAgeDays >= 30 && totalUserInteractions >= 3) weight = 1.2;
    if (isSuspicious) weight = 0.25;

    const name = dbUser.name?.trim() || dbUser.email.split("@")[0];
    const ipHash = hashIp(ip);

    await prisma.serviceReview.create({
      data: {
        serviceId: service.id,
        providerId: service.userId,
        userId: user.id,
        conversationId: null,
        ipHash,
        name,
        rating,
        comment,
        weight,
        suspicionScore,
        isSuspicious,
        isApproved: !isSuspicious,
        isVisible: !isSuspicious,
      },
    });

    return NextResponse.json({
      ok: true,
      messageCode: isSuspicious ? "PENDING_APPROVAL" : "REVIEW_SAVED",
    });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return errorJson("ALREADY_EXISTS", 409);
    }

    logError("POST /api/services/[id]/reviews failed", {
      requestId,
      route: "/api/services/[id]/reviews",
      ip,
      meta: { message: err instanceof Error ? err.message : String(err) },
    });

    return errorJson("SERVER_ERROR", 500);
  }
}