// src/app/[locale]/admin/reviews/ReviewsModerationClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./reviews.module.css";

type ReviewItem = {
  id: string;
  rating: number;
  name: string;
  comment: string;
  weight: number;
  suspicionScore: number;
  isSuspicious: boolean;
  isApproved: boolean;
  isVisible: boolean;
  createdAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string | null;
  };
  provider: {
    id: string;
    email: string;
    name: string | null;
  };
  service: {
    id: string;
    title: string;
    slug: string;
    locationCity: string | null;
  };
};

type Props = {
  locale: string;
  initialReviews: ReviewItem[];
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function accountAge(createdAt: string | null) {
  if (!createdAt) return "—";

  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));

  if (days === 0) return "Šiandien";
  if (days === 1) return "1 diena";
  return `${days} d.`;
}

function stars(rating: number) {
  const clean = Math.max(1, Math.min(5, rating));
  return "★".repeat(clean) + "☆".repeat(5 - clean);
}

export default function ReviewsModerationClient({
  locale,
  initialReviews,
}: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasReviews = reviews.length > 0;

  const averageSuspicion = useMemo(() => {
    if (reviews.length === 0) return 0;

    const sum = reviews.reduce((acc, review) => acc + review.suspicionScore, 0);
    return Math.round(sum / reviews.length);
  }, [reviews]);

  async function moderate(reviewId: string, action: "approve" | "reject") {
    setBusyId(reviewId);
    setError(null);

    try {
      const res = await csrfFetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Nepavyko atlikti veiksmo.");
      }

      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Serverio klaida.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelTop}>
        <div>
          <h2>Pending reviews</h2>
          <p>
            Vidutinis suspicious score: <strong>{averageSuspicion}</strong>
          </p>
        </div>

        <div className={styles.countBadge}>{reviews.length}</div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {!hasReviews ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <h3>Nėra laukiančių atsiliepimų</h3>
          <p>Visi suspicious reviews šiuo metu sutvarkyti.</p>
        </div>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => {
            const isBusy = busyId === review.id;
            const serviceHref = `/${locale}/services/${review.service.slug}`;

            return (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewMain}>
                  <div className={styles.reviewHeader}>
                    <div>
                      <div className={styles.stars}>{stars(review.rating)}</div>
                      <h3>{review.name}</h3>
                    </div>

                    <div
                      className={`${styles.scoreBadge} ${
                        review.suspicionScore >= 80
                          ? styles.scoreHigh
                          : review.suspicionScore >= 60
                            ? styles.scoreMedium
                            : styles.scoreLow
                      }`}
                    >
                      Score {review.suspicionScore}
                    </div>
                  </div>

                  <p className={styles.comment}>{review.comment}</p>

                  <div className={styles.metaGrid}>
                    <div>
                      <span>Review data</span>
                      <strong>{formatDate(review.createdAt)}</strong>
                    </div>

                    <div>
                      <span>Weight</span>
                      <strong>{review.weight}</strong>
                    </div>

                    <div>
                      <span>User account age</span>
                      <strong>{accountAge(review.user.createdAt)}</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>Pending approval</strong>
                    </div>
                  </div>

                  <div className={styles.relationGrid}>
                    <div>
                      <span>Autorius</span>
                      <strong>
                        {review.user.name || review.user.email.split("@")[0]}
                      </strong>
                      <small>{review.user.email}</small>
                    </div>

                    <div>
                      <span>Provideris</span>
                      <strong>
                        {review.provider.name ||
                          review.provider.email.split("@")[0]}
                      </strong>
                      <small>{review.provider.email}</small>
                    </div>

                    <div>
                      <span>Paslauga</span>
                      <Link href={serviceHref} target="_blank">
                        {review.service.title}
                      </Link>
                      <small>{review.service.locationCity || "—"}</small>
                    </div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approveButton}
                    disabled={isBusy}
                    onClick={() => void moderate(review.id, "approve")}
                  >
                    {isBusy ? "Tvarkoma..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className={styles.rejectButton}
                    disabled={isBusy}
                    onClick={() => void moderate(review.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}