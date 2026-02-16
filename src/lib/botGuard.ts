// src/lib/botGuard.ts
export type BotGuardPayload = {
  // honeypot laukas (turėtų būti tuščias)
  website?: string | null;

  // kiek ms užtruko užpildyti formą (client gali siųst)
  tookMs?: number | null;
};

export function isLikelyBot(payload: BotGuardPayload) {
  const website = (payload.website ?? "").trim();
  if (website.length > 0) return { ok: false as const, reason: "honeypot" };

  const tookMs = typeof payload.tookMs === "number" ? payload.tookMs : null;
  // žmogus paprastai neužpildo realios formos per < 1200ms
  if (tookMs !== null && tookMs > 0 && tookMs < 1200) {
    return { ok: false as const, reason: "too_fast" };
  }

  return { ok: true as const, reason: null };
}