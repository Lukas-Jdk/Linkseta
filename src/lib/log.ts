// src/lib/log.ts
import { writeLog } from "@/lib/logger";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

export function log(level: LogLevel, message: string, meta?: LogMeta) {
  writeLog(level, {
    msg: message,
    meta,
  });
}