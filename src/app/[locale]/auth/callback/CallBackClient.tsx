// src/app/[locale]/auth/callback/CallBackClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";

const ALLOWED_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && ALLOWED_OTP_TYPES.includes(value as EmailOtpType));
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function CallbackClient() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params?.locale ?? "lt";

  const ranRef = useRef(false);
  const [message, setMessage] = useState("Tvirtinama...");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    async function waitForSession() {
      const supabase = getSupabaseBrowserClient();

      for (let i = 0; i < 8; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) return session;
        await sleep(500);
      }

      return null;
    }

    async function run() {
      try {
        const supabase = getSupabaseBrowserClient();

        const flow = searchParams.get("flow");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const code = searchParams.get("code");

        let authOk = false;

        // 1) PIRMENYBĖ: token_hash flow (stabiliausias email patvirtinimui)
        if (tokenHash && isOtpType(type)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (error) {
            console.error("verifyOtp error:", error);
            setMessage("Patvirtinimo nuoroda nebegalioja arba jau buvo panaudota.");
            return;
          }

          authOk = true;
        }

        // 2) Tik jei nėra token_hash, tada bandome code flow
        else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("exchangeCodeForSession error:", error);
            setMessage("Nepavyko patvirtinti el. pašto. Bandykite dar kartą.");
            return;
          }

          authOk = true;
        }

        const session = await waitForSession();

        if (!authOk && !session) {
          setMessage(
            "Patvirtinimo nuoroda neteisinga arba pasibaigusi. Bandykite registruotis dar kartą.",
          );
          return;
        }

        await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch((err) => {
          console.error("sync-user error:", err);
        });

        if (cancelled) return;

        if (typeof window !== "undefined") {
          const cleanUrl =
            flow === "signup-confirmed"
              ? `/${locale}/auth/callback?flow=signup-confirmed`
              : `/${locale}/auth/callback`;

          window.history.replaceState({}, "", cleanUrl);
        }

        if (flow === "signup-confirmed") {
          setMessage(
            "El. paštas sėkmingai patvirtintas. Po 5 sekundžių būsite nukreipti į prisijungimą.",
          );

          window.setTimeout(() => {
            router.replace(`/${locale}/login?confirmed=1`);
          }, 5000);

          return;
        }

        setMessage("Prisijungimas sėkmingas. Nukreipiame...");

        window.setTimeout(() => {
          router.replace(`/${locale}/dashboard`);
        }, 1200);
      } catch (e) {
        console.error("CallbackClient fatal error:", e);
        setMessage("Įvyko klaida. Bandykite dar kartą.");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [locale, router, searchParams]);

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Linkseta</h1>
      <p>{message}</p>
    </main>
  );
}