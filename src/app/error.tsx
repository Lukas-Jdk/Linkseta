"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Galima loginti į sentry/logus ateičiai
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="lt">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          background: "#f3f4f6",
        }}
      >
        <main
          style={{
            maxWidth: 640,
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            padding: "32px 24px",
          }}
        >
          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>
            Įvyko klaida
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              marginBottom: 12,
              color: "#111827",
            }}
          >
            Ups... kažkas neveikia taip, kaip turėtų
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#4b5563",
              marginBottom: 24,
            }}
          >
            Mūsų puslapis susidūrė su netikėta klaida. Bandykite perkrauti
            puslapį. Jei klaida kartojasi – parašykite mums.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "#0c7bdc",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Perkrauti puslapį
          </button>
        </main>
      </body>
    </html>
  );
}
