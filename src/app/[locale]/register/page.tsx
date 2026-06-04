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

type Locale = "lt" | "en" | "no";

type FieldErrors = {
  name?: string;
  surname?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

function getLocalText(locale: string) {
  if (locale === "en") {
    return {
      confirmPasswordPlaceholder: "Repeat password",
      termsRequired: "You must agree to the Terms and Privacy Policy.",
      nameRequired: "Enter your first name.",
      surnameRequired: "Enter your last name.",
      companyRequired: "Enter your company or brand name.",
      phoneInvalid: "Enter a valid phone number.",
      emailRequired: "Enter your email address.",
      emailInvalid: "Enter a valid email address.",
      passwordRequired: "Enter a password.",
      passwordTooShort: "Password must be at least 8 characters.",
      passwordWeak: "Use at least one letter and one number.",
      passwordMismatch: "Passwords do not match.",
      agreeStart: "I agree to the",
      and: "and",
    };
  }

  if (locale === "no") {
    return {
      confirmPasswordPlaceholder: "Gjenta passord",
      termsRequired: "Du må godta vilkårene og personvernerklæringen.",
      nameRequired: "Skriv inn fornavn.",
      surnameRequired: "Skriv inn etternavn.",
      companyRequired: "Skriv inn firma- eller merkenavn.",
      phoneInvalid: "Skriv inn et gyldig telefonnummer.",
      emailRequired: "Skriv inn e-postadressen din.",
      emailInvalid: "Skriv inn en gyldig e-postadresse.",
      passwordRequired: "Skriv inn et passord.",
      passwordTooShort: "Passordet må være minst 8 tegn.",
      passwordWeak: "Bruk minst én bokstav og ett tall.",
      passwordMismatch: "Passordene er ikke like.",
      agreeStart: "Jeg godtar",
      and: "og",
    };
  }

  return {
    confirmPasswordPlaceholder: "Pakartokite slaptažodį",
    termsRequired: "Turite sutikti su taisyklėmis ir privatumo politika.",
    nameRequired: "Įveskite vardą.",
    surnameRequired: "Įveskite pavardę.",
    companyRequired: "Įveskite įmonės arba prekės ženklo pavadinimą.",
    phoneInvalid: "Įveskite teisingą telefono numerį.",
    emailRequired: "Įveskite el. pašto adresą.",
    emailInvalid: "Įveskite teisingą el. pašto adresą.",
    passwordRequired: "Įveskite slaptažodį.",
    passwordTooShort: "Slaptažodis turi būti bent 8 simbolių.",
    passwordWeak: "Naudokite bent vieną raidę ir vieną skaičių.",
    passwordMismatch: "Slaptažodžiai nesutampa.",
    agreeStart: "Sutinku su",
    and: "ir",
  };
}

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  const clean = value.replace(/[^\d+]/g, "");
  return clean.length >= 7 && clean.length <= 20;
}

function isStrongEnoughPassword(value: string) {
  return /[A-Za-zÀ-ž]/.test(value) && /\d/.test(value);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      style={{
        margin: "-8px 0 2px",
        color: "#b91c1c",
        fontSize: "0.82rem",
        fontWeight: 800,
        fontFamily: "var(--font-second)",
      }}
    >
      {message}
    </p>
  );
}

export default function RegisterPage() {
  const t = useTranslations("registerPage");
  const params = useParams<{ locale: string }>();
  const locale = (params?.locale ?? "lt") as Locale;
  const text = getLocalText(locale);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validateForm() {
    const nextErrors: FieldErrors = {};

    const cleanName = name.trim();
    const cleanSurname = surname.trim();
    const cleanCompanyName = companyName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      nextErrors.name = text.nameRequired;
    }

    if (cleanSurname.length < 2) {
      nextErrors.surname = text.surnameRequired;
    }

    if (cleanCompanyName.length < 2) {
      nextErrors.companyName = text.companyRequired;
    }

    if (!isValidPhone(cleanPhone)) {
      nextErrors.phone = text.phoneInvalid;
    }

    if (!cleanEmail) {
      nextErrors.email = text.emailRequired;
    } else if (!isValidEmail(cleanEmail)) {
      nextErrors.email = text.emailInvalid;
    }

    if (!password) {
      nextErrors.password = text.passwordRequired;
    } else if (password.length < 8) {
      nextErrors.password = text.passwordTooShort;
    } else if (!isStrongEnoughPassword(password)) {
      nextErrors.password = text.passwordWeak;
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = text.passwordMismatch;
    }

    if (!acceptedTerms) {
      nextErrors.terms = text.termsRequired;
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

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
      setConfirmPassword("");
    } catch (e) {
      console.error("register unexpected error:", e);
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;

      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              autoComplete="given-name"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </div>
          <FieldError message={fieldErrors.name} />

          <div className={styles.inputRow}>
            <User className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("surnamePlaceholder")}
              value={surname}
              onChange={(e) => {
                setSurname(e.target.value);
                clearFieldError("surname");
              }}
              autoComplete="family-name"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.surname)}
            />
          </div>
          <FieldError message={fieldErrors.surname} />

          <div className={styles.inputRow}>
            <Building2 className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="text"
              placeholder={t("companyNamePlaceholder")}
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                clearFieldError("companyName");
              }}
              autoComplete="organization"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.companyName)}
            />
          </div>
          <FieldError message={fieldErrors.companyName} />

          <div className={styles.inputRow}>
            <Phone className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="tel"
              placeholder={t("phonePlaceholder")}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError("phone");
              }}
              autoComplete="tel"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
          </div>
          <FieldError message={fieldErrors.phone} />

          <div className={styles.inputRow}>
            <Mail className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              autoComplete="email"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </div>
          <FieldError message={fieldErrors.email} />

          <div className={styles.inputRow}>
            <Lock className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
                clearFieldError("confirmPassword");
              }}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.password)}
            />
          </div>
          <FieldError message={fieldErrors.password} />

          <div className={styles.inputRow}>
            <Lock className={styles.icon} aria-hidden="true" />
            <input
              className={styles.input}
              type="password"
              placeholder={text.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
          </div>
          <FieldError message={fieldErrors.confirmPassword} />

          <div className={styles.hint}>{t("passwordHint")}</div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 2,
              color: "#475569",
              fontSize: "0.88rem",
              lineHeight: 1.55,
              fontWeight: 700,
              fontFamily: "var(--font-second)",
              cursor: loading ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={acceptedTerms}
              disabled={loading}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                clearFieldError("terms");
              }}
              style={{
                width: 17,
                height: 17,
                marginTop: 2,
                accentColor: "#14b8a6",
                flex: "0 0 auto",
              }}
            />

            <span>
              {text.agreeStart}{" "}
              <LocalizedLink href="/terms" className={styles.link}>
                {t("terms")}
              </LocalizedLink>{" "}
              {text.and}{" "}
              <LocalizedLink href="/privacy" className={styles.link}>
                {t("privacy")}
              </LocalizedLink>
              .
            </span>
          </label>
          <FieldError message={fieldErrors.terms} />

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