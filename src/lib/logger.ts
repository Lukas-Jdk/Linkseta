// src/lib/logger.ts
import crypto from "crypto";

export type LoggerLevel = "debug" | "info" | "warn" | "error";

type LogBase = {
  level: LoggerLevel;
  msg: string;
  at: string;
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

export function writeLog(
  level: LoggerLevel,
  data: Omit<LogBase, "level" | "at">,
) {
  const payload: LogBase = {
    level,
    at: new Date().toISOString(),
    ...data,
    meta: data.meta !== undefined ? safeJson(data.meta) : undefined,
  };

  const line = JSON.stringify(payload);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "info") console.info(line);
  else console.debug(line);
}

export function logInfo(
  msg: string,
  meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown },
) {
  writeLog("info", { msg, ...meta });
}

export function logWarn(
  msg: string,
  meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown },
) {
  writeLog("warn", { msg, ...meta });
}

export function logError(
  msg: string,
  meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown },
) {
  writeLog("error", { msg, ...meta });
}

export function logDebug(
  msg: string,
  meta?: Omit<LogBase, "level" | "msg" | "at" | "meta"> & { meta?: unknown },
) {
  writeLog("debug", { msg, ...meta });
}