// src/app/[locale]/susisiekite/ContactForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./susisiekite.module.css";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export default function ContactForm() {
  const t = useTranslations("contactForm");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getRecaptchaToken() {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      return null;
    }

    if (!window.grecaptcha) {
      throw new Error(t("errors.recaptchaNotLoaded"));
    }

    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(siteKey, {
            action: "contact_form",
          });
          resolve(token);
        } catch {
          reject(new Error(t("errors.recaptchaFailed")));
        }
      });
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const recaptchaToken = await getRecaptchaToken();

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          recaptchaToken,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("errors.sendFailed"));
      }

      setSuccess(t("success"));
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>{t("nameLabel")}</label>
        <input
          className={styles.input}
          type="text"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t("emailLabel")}</label>
        <input
          className={styles.input}
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t("messageLabel")}</label>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder={t("messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={3000}
        />
      </div>

      {success ? <p className={styles.successText}>{success}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}

      <button type="submit" className={styles.submitButton} disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}