// src/app/[locale]/forgot-password/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import styles from "../login/login.module.css";

function mapForgotPasswordError(
  raw: string | null | undefined,
  t: ReturnType<typeof useTranslations<"forgotPasswordPage">>,
) {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return t("errors.sendFailed");
  }

  if (
    msg.includes("email address is invalid") ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email address")
  ) {
    return t("errors.invalidEmail");
  }

  if (
    msg.includes("email rate limit exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
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

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";
  const t = useTranslations("forgotPasswordPage");

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email.trim()) {
      setError(t("errors.missingEmail"));
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/${locale}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        console.error("forgot password error:", error);
        setError(mapForgotPasswordError(error.message, t));
      } else {
        setMessage(t("success"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t("loading") : t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}