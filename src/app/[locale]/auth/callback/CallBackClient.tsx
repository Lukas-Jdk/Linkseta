"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function safeNext(next: string | null, locale: string) {
  if (!next) return `/${locale}/login`;
  if (!next.startsWith("/")) return `/${locale}/login`;
  if (next.startsWith("//")) return `/${locale}/login`;
  if (next.includes("://")) return `/${locale}/login`;
  return next;
}

export default function CallbackClient() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";
  const sp = useSearchParams();

  const next = safeNext(sp.get("next") || sp.get("redirect"), locale);

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(next);
      router.refresh();
    }, 1200);

    return () => clearTimeout(t);
  }, [router, next]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          textAlign: "center",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
          padding: "32px 24px",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, color: "#111827" }}>
          El. paštas patvirtintas ✅
        </h1>
        <p style={{ fontSize: 15, color: "#4b5563", marginBottom: 18 }}>
          Tuoj nukreipsime tave į prisijungimą…
        </p>

        <button
          type="button"
          onClick={() => {
            router.replace(next);
            router.refresh();
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            background: "#0c7bdc",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Eiti į prisijungimą
        </button>

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 14 }}>
          Jei nenukreipė automatiškai – spausk mygtuką.
        </p>
      </div>
    </main>
  );
}