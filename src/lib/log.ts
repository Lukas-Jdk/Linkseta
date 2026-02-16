// src/lib/log.ts
export type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

export function log(level: LogLevel, message: string, meta?: LogMeta) {
  const payload = meta ? { message, ...meta } : { message };

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else if (level === "info") console.info(payload);
  else console.log(payload);
}