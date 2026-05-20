// src/app/[locale]/services/[slug]/ReviewForm.tsx
"use client";

import { useState } from "react";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./slugPage.module.css";

type Props = {
  serviceId: string;
};

export default function ReviewForm({ serviceId }: Props) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await csrfFetch(`/api/services/${serviceId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          comment,
          rating,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Failed");
        return;
      }

      setSuccess(json?.message || "Review submitted");
      setComment("");
      setRating(5);
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.reviewFormWrap}>
      <div className={styles.reviewFormHead}>
        <h3 className={styles.reviewFormTitle}>Leave a review</h3>
        <p>Only registered users can leave one review per service.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.reviewForm}>
        <div className={styles.starPicker} aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? styles.starActive : styles.starButton}
              onClick={() => setRating(value)}
              aria-label={`${value} stars`}
            >
              ★
            </button>
          ))}

          <span>{rating}/5</span>
        </div>

        <textarea
          className={styles.reviewTextarea}
          placeholder="Write your review..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
        />

        {error && <div className={styles.reviewError}>{error}</div>}
        {success && <div className={styles.reviewSuccess}>{success}</div>}

        <button
          type="submit"
          className={styles.reviewSubmit}
          disabled={loading}
        >
          {loading ? "Sending..." : "Submit review"}
        </button>
      </form>
    </div>
  );
}