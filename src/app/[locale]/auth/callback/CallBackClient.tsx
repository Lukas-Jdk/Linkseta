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

      // bandome kelis kartus, nes po verify redirect session ne visada atsiranda akimirksniu
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

        const code = searchParams.get("code");
        const flow = searchParams.get("flow");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        let authStepOk = false;

        // 1) PKCE flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("exchangeCodeForSession error:", error);
            setMessage("Nepavyko patvirtinti el. pašto. Bandykite dar kartą.");
            return;
          }

          authStepOk = true;
        }

        // 2) OTP / token_hash flow
        else if (tokenHash && isOtpType(type)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (error) {
            console.error("verifyOtp error:", error);
            setMessage("Patvirtinimo nuoroda nebegalioja arba jau buvo panaudota.");
            return;
          }

          authStepOk = true;
        }

        // 3) Hash flow (#access_token=...)
        else if (typeof window !== "undefined" && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.error("setSession error:", error);
              setMessage("Nepavyko užbaigti prisijungimo. Bandykite dar kartą.");
              return;
            }

            authStepOk = true;
          }
        }

        // 4) palaukiam session net jei nebuvo akivaizdaus code/tokenHash
        const session = await waitForSession();

        if (!authStepOk && !session) {
          setMessage(
            "Patvirtinimo nuoroda neteisinga arba pasibaigusi. Bandykite registruotis dar kartą.",
          );
          return;
        }

        // sync DB user
        await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch((err) => {
          console.error("sync-user error:", err);
        });

        if (cancelled) return;

        // išvalom URL
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