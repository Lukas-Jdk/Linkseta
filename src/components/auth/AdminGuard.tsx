// src/components/auth/AdminGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

type GuardState = "loading" | "allowed" | "denied";

type Role = "ADMIN" | "USER" | "GUEST";

type RoleResponse = {
  role: Role;
};

export default function AdminGuard({ children }: Props) {
  const [state, setState] = useState<GuardState>("loading");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // Tiesiog pasiklausiam serverio, kokia rolė pagal cookies
        const res = await fetch("/api/auth/role", {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("AdminGuard /api/auth/role error:", res.status);
          if (!cancelled) setState("denied");
          return;
        }

        const json = (await res.json()) as RoleResponse;
        console.log("AdminGuard role:", json.role);

        if (cancelled) return;

        if (json.role === "ADMIN") {
          setState("allowed");
        } else {
          setState("denied");
        }
      } catch (e) {
        console.error("AdminGuard error:", e);
        if (!cancelled) setState("denied");
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  // jei deny – permetam į pagrindinį
  useEffect(() => {
    if (state === "denied") {
      router.replace("/");
    }
  }, [state, router]);

  if (state === "loading") {
    return (
      <main style={{ padding: "40px 0", textAlign: "center" }}>
        <p>Kraunama...</p>
      </main>
    );
  }

  if (state === "denied") {
    return null;
  }

  return <>{children}</>;
}
