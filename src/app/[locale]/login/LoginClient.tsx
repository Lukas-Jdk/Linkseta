// src/app/[locale]/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "./login.module.css";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { Mail, Lock } from "lucide-react";

function mapLoginErrorMessage(
  raw: string | null | undefined,
  t: ReturnType<typeof useTranslations<"loginPage">>,
): string {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return t("errors.generic");
  }

  if (msg.includes("invalid login credentials")) {
    return t("errors.invalidCredentials");
  }

  if (msg.includes("email not confirmed")) {
    return t("errors.emailNotConfirmed");
  }

  if (
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("over_request_rate_limit")
  ) {
    return t("errors.tooManyRequests");
  }

  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch")
  ) {
    return t("errors.network");
  }

  return t("errors.withReason", { reason: raw || "" });
}

export default function LoginClient() {
  const t = useTranslations("loginPage");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return `/${locale}/dashboard`;

    if (!next.startsWith("/")) return `/${locale}/dashboard`;
    if (next.startsWith("//")) return `/${locale}/dashboard`;
    if (next.includes("://")) return `/${locale}/dashboard`;
    return next;
  }, [searchParams, locale]);

  const confirmedMessage = useMemo(() => {
    return searchParams.get("confirmed") === "1"
      ? t("confirmedMessage")
      : null;
  }, [searchParams, t]);

  const confirmErrorMessage = useMemo(() => {
    return searchParams.get("error") === "confirm_failed"
      ? t("confirmErrorMessage")
      : null;
  }, [searchParams, t]);

  const resetMessage = useMemo(() => {
    return searchParams.get("reset") === "1"
      ? t("resetMessage")
      : null;
  }, [searchParams, t]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError(t("errors.missingFields"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("login error:", error);
        setError(mapLoginErrorMessage(error.message, t));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      console.error("login unexpected error:", err);
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>

        {confirmedMessage && <p className={styles.success}>{confirmedMessage}</p>}
        {resetMessage && <p className={styles.success}>{resetMessage}</p>}
        {confirmErrorMessage && <p className={styles.error}>{confirmErrorMessage}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <Mail className={styles.icon} />
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputRow}>
            <Lock className={styles.icon} />
            <input
              type="password"
              placeholder={t("passwordPlaceholder")}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? t("loading") : t("submit")}
          </button>

          <p className={styles.helperText}>
            {t("forgotPassword")}{" "}
            <LocalizedLink href="/forgot-password" className={styles.link}>
              {t("resetLink")}
            </LocalizedLink>
          </p>
        </form>
      </div>
    </main>
  );
}