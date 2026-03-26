// src/app/[locale]/register/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "./register.module.css";
import { User, Phone, Mail, Lock, Building2 } from "lucide-react";
import { csrfFetch } from "@/lib/csrfClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

function mapRegisterError(
  raw: string | null | undefined,
  t: ReturnType<typeof useTranslations<"registerPage">>,
) {
  const msg = (raw || "").toLowerCase().trim();

  if (!msg) {
    return t("errors.generic");
  }

  if (
    msg.includes("already registered") ||
    msg.includes("user already registered") ||
    msg.includes("already exists")
  ) {
    return t("errors.emailInUse");
  }

  if (
    msg.includes("email address is invalid") ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email address")
  ) {
    return t("errors.invalidEmail");
  }

  if (
    msg.includes("password should be at least") ||
    msg.includes("weak password")
  ) {
    return t("errors.weakPassword");
  }

  if (
    msg.includes("signup is disabled") ||
    msg.includes("signups not allowed")
  ) {
    return t("errors.signupDisabled");
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

export default function RegisterPage() {
  const t = useTranslations("registerPage");
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const fullName = [name.trim(), surname.trim()].filter(Boolean).join(" ");

      const emailRedirectTo = `${window.location.origin}/${locale}/auth/confirm?flow=signup-confirmed`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: {
            name: fullName,
            phone: phone.trim(),
            companyName: companyName.trim(),
          },
        },
      });

      if (error) {
        console.error("register error:", error);
        setError(mapRegisterError(error.message, t));
        return;
      }

      if (data.session) {
        await csrfFetch("/api/auth/sync-user", { method: "POST" }).catch(
          () => {},
        );
      }

      setSuccess(t("success"));
      setPassword("");
    } catch (e) {
      console.error("register unexpected error:", e);
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

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("surnamePlaceholder")}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          <div className={styles.inputRow}>
            <Building2 className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("companyNamePlaceholder")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
            />
          </div>

          <div className={styles.inputRow}>
            <Phone className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className={styles.inputRow}>
            <Mail className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputRow}>
            <Lock className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="password"
              placeholder={t("passwordPlaceholder")}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.hint}>{t("passwordHint")}</div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? t("loading") : t("submit")}
          </button>

          <div className={styles.bottomText}>
            {t("alreadyHaveAccount")}{" "}
            <LocalizedLink href="/login" className={styles.link}>
              {t("loginLink")}
            </LocalizedLink>
          </div>

          <div className={styles.legal}>
            {t("legalStart")}{" "}
            <LocalizedLink href="/terms" className={styles.link}>
              {t("terms")}
            </LocalizedLink>{" "}
            {t("legalAnd")}{" "}
            <LocalizedLink href="/privacy" className={styles.link}>
              {t("privacy")}
            </LocalizedLink>
            .
          </div>
        </form>
      </div>
    </main>
  );
}