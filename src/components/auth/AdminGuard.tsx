// src/components/auth/AdminGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

type GuardState = "loading" | "allowed" | "denied";

type RoleResponse = {
  role: "USER" | "ADMIN";
};

export default function AdminGuard({ children }: Props) {
  const [state, setState] = useState<GuardState>("loading");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // 1. Pasiimam supabase userį iš localStorage (kliento pusėje)
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user || !data.user.email) {
          if (!cancelled) setState("denied");
          return;
        }

        const email = data.user.email;

        // 2. Pagal emailą pasiimam rolę iš mūsų DB
        const res = await fetch(
          `/api/auth/role?email=${encodeURIComponent(email)}`
        );
        const json = (await res.json()) as RoleResponse;

        console.log("AdminGuard role:", json);

        if (!res.ok || json.role !== "ADMIN") {
          if (!cancelled) setState("denied");
        } else {
          if (!cancelled) setState("allowed");
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
