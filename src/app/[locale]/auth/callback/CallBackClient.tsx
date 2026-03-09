// src/app/[locale]/auth/callback/CallBackClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";

export default function CallbackClient() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params?.locale ?? "lt";

  const [message, setMessage] = useState("Tvirtinama...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = getSupabaseBrowserClient();

        const code = searchParams.get("code");
        const flow = searchParams.get("flow");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("Nepavyko patvirtinti el. pašto. Bandykite dar kartą.");
            return;
          }
        }

        await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch(() => {});

        if (cancelled) return;

        if (flow === "signup-confirmed") {
          setMessage("El. paštas sėkmingai patvirtintas. Po 5 sekundžių būsite nukreipti į prisijungimą.");

          setTimeout(() => {
            router.replace(`/${locale}/login?confirmed=1`);
          }, 5000);

          return;
        }

        setMessage("Prisijungimas sėkmingas. Nukreipiame...");
        setTimeout(() => {
          router.replace(`/${locale}/dashboard`);
        }, 1000);
      } catch (e) {
        console.error(e);
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