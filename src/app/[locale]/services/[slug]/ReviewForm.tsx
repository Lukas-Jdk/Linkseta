// src/app/[locale]/services/[slug]/ReviewForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./slugPage.module.css";

type Props = {
  serviceId: string;
};

const MIN_REVIEW_LENGTH = 20;

type ReviewErrorCode =
  | "LOGIN_REQUIRED"
  | "INVALID_RATING"
  | "TOO_SHORT"
  | "SERVICE_NOT_FOUND"
  | "OWN_SERVICE"
  | "USER_NOT_FOUND"
  | "ACCOUNT_TOO_NEW"
  | "CHAT_REQUIRED"
  | "INTERACTION_REQUIRED"
  | "WAIT_24H"
  | "ALREADY_EXISTS"
  | "SERVER_ERROR";

type ReviewMessageCode = "PENDING_APPROVAL" | "REVIEW_SAVED";

function isReviewErrorCode(value: unknown): value is ReviewErrorCode {
  return (
    value === "LOGIN_REQUIRED" ||
    value === "INVALID_RATING" ||
    value === "TOO_SHORT" ||
    value === "SERVICE_NOT_FOUND" ||
    value === "OWN_SERVICE" ||
    value === "USER_NOT_FOUND" ||
    value === "ACCOUNT_TOO_NEW" ||
    value === "CHAT_REQUIRED" ||
    value === "INTERACTION_REQUIRED" ||
    value === "WAIT_24H" ||
    value === "ALREADY_EXISTS" ||
    value === "SERVER_ERROR"
  );
}

function isReviewMessageCode(value: unknown): value is ReviewMessageCode {
  return value === "PENDING_APPROVAL" || value === "REVIEW_SAVED";
}

export default function ReviewForm({ serviceId }: Props) {
  const t = useTranslations("reviewMessages");

  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const cleanComment = comment.trim();

  const tooShort =
    cleanComment.length > 0 && cleanComment.length < MIN_REVIEW_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (cleanComment.length < MIN_REVIEW_LENGTH) {
      setError(t("TOO_SHORT", { min: MIN_REVIEW_LENGTH }));
      return;
    }

    setLoading(true);

    try {
      const res = await csrfFetch(`/api/services/${serviceId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          comment: cleanComment,
          rating,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const code = json?.errorCode;

        setError(
          isReviewErrorCode(code)
            ? t(code, { min: json?.min ?? MIN_REVIEW_LENGTH })
            : t("SERVER_ERROR"),
        );

        return;
      }

      const messageCode = json?.messageCode;

      setSuccess(
        isReviewMessageCode(messageCode)
          ? t(messageCode)
          : t("REVIEW_SAVED"),
      );

      setComment("");
      setRating(5);
    } catch {
      setError(t("SERVER_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.reviewFormWrap}>
      <div className={styles.reviewFormHead}>
        <h3 className={styles.reviewFormTitle}>{t("title")}</h3>
        <p>{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.reviewForm}>
        <div className={styles.starPicker} aria-label={t("ratingAria")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? styles.starActive : styles.starButton}
              onClick={() => setRating(value)}
              aria-label={t("starsAria", { count: value })}
              disabled={loading}
            >
              ★
            </button>
          ))}

          <span>{rating}/5</span>
        </div>

        <textarea
          className={styles.reviewTextarea}
          placeholder={t("placeholder", { min: MIN_REVIEW_LENGTH })}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          minLength={MIN_REVIEW_LENGTH}
          maxLength={1000}
          disabled={loading}
        />

        <div className={styles.charHint}>{cleanComment.length} / 1000</div>

        {tooShort && (
          <div className={styles.reviewError}>
            {t("TOO_SHORT", { min: MIN_REVIEW_LENGTH })}
          </div>
        )}

        {error && <div className={styles.reviewError}>{error}</div>}
        {success && <div className={styles.reviewSuccess}>{success}</div>}

        <button
          type="submit"
          className={styles.reviewSubmit}
          disabled={loading || cleanComment.length < MIN_REVIEW_LENGTH}
        >
          {loading ? t("sending") : t("submit")}
        </button>
      </form>
    </div>
  );
}