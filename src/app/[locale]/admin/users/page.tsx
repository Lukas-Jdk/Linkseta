// src/components/auth/AdminGuard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
};

type GuardState = "loading" | "allowed" | "denied";
type Role = "ADMIN" | "USER" | "GUEST";
type RoleResponse = { role: Role };

function isLocale(value: string): boolean {
  return (routing.locales as readonly string[]).includes(value);
}

export default function AdminGuard({ children }: Props) {
  const [state, setState] = useState<GuardState>("loading");
  const router = useRouter();
  const params = useParams();

  const locale = useMemo(() => {
    const raw = params?.locale;
    const l = typeof raw === "string" ? raw : "";
    return isLocale(l) ? l : routing.defaultLocale;
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/role", { cache: "no-store" });

        if (!res.ok) {
          if (!cancelled) setState("denied");
          return;
        }

        const json = (await res.json()) as RoleResponse;

        if (cancelled) return;

        if (json.role === "ADMIN") setState("allowed");
        else setState("denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state === "denied") {
      router.replace(`/${locale}`);
    }
  }, [state, router, locale]);

  if (state === "loading") {
    return (
      <main style={{ padding: "40px 0", textAlign: "center" }}>
        <p>Kraunama...</p>
      </main>
    );
  }

  if (state === "denied") return null;
  return <>{children}</>;
}