// src/lib/logger.ts
import crypto from "crypto";

type LogLevel = "info" | "warn" | "error";

type LogBase = {
  level: LogLevel;
  msg: string;
  at: string; // ISO
  requestId?: string;
  route?: string;
  ip?: string;
  userId?: string;
  meta?: unknown;
};

function safeJson(x: unknown) {
  try {
    return JSON.parse(JSON.stringify(x));
  } catch {
    return String(x);
  }
}

export function newRequestId() {
  return crypto.randomUUID?.() ?? crypto.randomBytes(16).toString("hex");
}

export function log(level: LogLevel, data: Omit<LogBase, "level" | "at">) {
  const payload: LogBase = {
    level,
    at: new Date().toISOString(),
    ...data,
    meta: data.meta !== undefined ? safeJson(data.meta) : undefined,
  };

  // Vercel/Node geriausiai suvalgo JSON logs
  const line = JSON.stringify(payload);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(msg: string, meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown }) {
  log("info", { msg, ...meta });
}

export function logWarn(msg: string, meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown }) {
  log("warn", { msg, ...meta });
}

export function logError(msg: string, meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown }) {
  log("error", { msg, ...meta });
}