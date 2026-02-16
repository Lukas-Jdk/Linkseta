// src/lib/audit.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function auditLog(input: AuditInput) {
  try {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
     
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };

    await prisma.auditLog.create({ data });
  } catch (error) {
    console.warn("AUDIT_LOG_FAIL", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      error,
    });
  }
}