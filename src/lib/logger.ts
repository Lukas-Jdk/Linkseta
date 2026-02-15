// src/lib/logger.ts
type Level = "info" | "warn" | "error";

export function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    msg,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };

  // Vercel logai skaito console.*
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}