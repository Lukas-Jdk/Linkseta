// src/app/[locale]/error.tsx
"use client";

import LocalizedLink from "@/components/i18n/LocalizedLink";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error("Global error:", error);

  return (
    <main
      style={{
        minHeight: "60vh",
        padding: "40px 16px 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="card-elevated card-padding-lg"
        style={{
          maxWidth: 640,
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>
          Įvyko klaida
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            marginBottom: 10,
            color: "#111827",
          }}
        >
          Kažkas nesuveikė
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#4b5563",
            marginBottom: 22,
          }}
        >
          Bandykite perkrauti puslapį. Jei klaida kartojasi – susisiekite su
          administracija.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => reset()}
          >
            Perkrauti
          </button>

          <LocalizedLink href="/" className="btn btn-outline">
            Grįžti į pradžią
          </LocalizedLink>
        </div>
      </div>
    </main>
  );
}
