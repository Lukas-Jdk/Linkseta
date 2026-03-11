// src/app/[locale]/auth/callback/CallBackClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";

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

    async function run() {
      try {
        const flow = searchParams.get("flow");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const code = searchParams.get("code");

        // 1) Jei yra token_hash + type -> perleidžiam į vieną pagrindinį flow
        if (tokenHash && type) {
          const url = new URL(window.location.href);
          url.pathname = `/${locale}/auth/confirm`;
          window.location.replace(url.toString());
          return;
        }

        // 2) Compatibility fallback senam code flow
        if (code) {
          const supabase = getSupabaseBrowserClient();

          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("exchangeCodeForSession error:", error);
            if (!cancelled) {
              setMessage("Nepavyko patvirtinti prisijungimo. Bandykite dar kartą.");
            }
            return;
          }

          await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch((err) => {
            console.error("sync-user error:", err);
          });

          if (cancelled) return;

          if (flow === "signup-confirmed") {
            setMessage("El. paštas sėkmingai patvirtintas. Nukreipiame į prisijungimą...");
            window.setTimeout(() => {
              router.replace(`/${locale}/login?confirmed=1`);
            }, 1200);
            return;
          }

          setMessage("Prisijungimas sėkmingas. Nukreipiame...");
          window.setTimeout(() => {
            router.replace(`/${locale}/dashboard`);
          }, 1200);
          return;
        }

        if (!cancelled) {
          setMessage("Nuoroda neteisinga arba pasibaigusi.");
        }
      } catch (e) {
        console.error("CallbackClient fatal error:", e);
        if (!cancelled) {
          setMessage("Įvyko klaida. Bandykite dar kartą.");
        }
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