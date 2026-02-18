// src/app/[locale]/not-found.tsx
import Link from "next/link";

export default function NotFoundPage() {
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
          Klaida 404
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            marginBottom: 12,
            color: "#111827",
          }}
        >
          Puslapis nerastas
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#4b5563",
            marginBottom: 24,
          }}
        >
          Atrodo, kad tokio adreso nėra. Galbūt paslauga buvo pašalinta arba
          nuoroda neteisinga.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "#0c7bdc",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Grįžti į pradžią
          </Link>
          <Link
            href="/services"
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              color: "#111827",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Žiūrėti paslaugas
          </Link>
        </div>
      </div>
    </main>
  );
}
