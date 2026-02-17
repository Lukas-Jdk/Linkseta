// src/lib/recaptcha.ts

type VerifyResult = {
  ok: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  error?: string;
};

export async function verifyRecaptchaV3(params: {
  token: string;
  expectedAction: string; // pvz. "provider_request"
  ip?: string | null;
}): Promise<VerifyResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // jei nėra SECRET — geriau failinti, kad nepaleistum be apsaugos
    return { ok: false, error: "Missing RECAPTCHA_SECRET_KEY" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", params.token);
  if (params.ip) body.set("remoteip", params.ip);

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = (await res.json()) as any;

    const ok = Boolean(json?.success);
    if (!ok) {
      return {
        ok: false,
        error: (json?.["error-codes"]?.[0] as string) || "recaptcha_failed",
      };
    }

    const action = json?.action as string | undefined;
    const score =
      typeof json?.score === "number" ? (json.score as number) : undefined;

    // action turi sutapti (apsaugo nuo tokeno reuse kitam endpointui)
    if (action && action !== params.expectedAction) {
      return { ok: false, score, action, error: "wrong_action" };
    }

    // score threshold (pas tave galima griežtinti vėliau)
    if (typeof score === "number" && score < 0.5) {
      return { ok: false, score, action, error: "low_score" };
    }

    return {
      ok: true,
      score,
      action,
      hostname: json?.hostname as string | undefined,
    };
  } catch (e) {
    console.error("reCAPTCHA verify error:", e);
    return { ok: false, error: "verify_exception" };
  }
}