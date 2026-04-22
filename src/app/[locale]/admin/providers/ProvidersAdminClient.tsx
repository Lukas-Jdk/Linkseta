// src/app/[locale]/admin/providers/ProvidersAdminClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./providersAdmin.module.css";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  priceNok: number;
  period: "MONTHLY" | "YEARLY";
  highlight: boolean;
  isTrial: boolean;
  trialDays: number | null;
  maxListings: number | null;
  maxImagesPerListing: number;
  canAppearOnHomepage: boolean;
  canBecomeTop: boolean;
};

type ProviderRow = {
  userId: string;
  email: string;
  name: string | null;
  createdAt: string;
  servicesCount: number;
  isApproved: boolean;
  lifetimeFree: boolean;
  lifetimeFreeGrantedAt: string | null;
  trialEndsAt: string | null;
  currentPlan: {
    id: string;
    slug: string;
    name: string;
    priceNok: number;
    period: "MONTHLY" | "YEARLY";
    highlight: boolean;
    isTrial: boolean;
    trialDays: number | null;
    maxListings: number | null;
    maxImagesPerListing: number;
    canAppearOnHomepage: boolean;
    canBecomeTop: boolean;
  } | null;
};

type Props = {
  locale: string;
  rows: ProviderRow[];
  plans: PlanRow[];
};

type Feedback =
  | { type: "success"; text: string }
  | { type: "error"; text: string };

function formatPlanLabel(plan: PlanRow) {
  if (plan.isTrial) {
    return `${plan.name} · ${plan.priceNok} NOK · ${plan.trialDays ?? 0} d. trial`;
  }

  const period = plan.period === "YEARLY" ? "yearly" : "monthly";
  return `${plan.name} · ${plan.priceNok} NOK/${period}`;
}

function formatPeriod(period: "MONTHLY" | "YEARLY") {
  return period === "YEARLY" ? "yearly" : "monthly";
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("lt-LT");
}

function planPrioritySlug(slug?: string | null) {
  if (slug === "premium") return 0;
  if (slug === "basic") return 1;
  if (slug === "free-trial") return 2;
  return 9;
}

export default function ProvidersAdminClient({
  locale,
  rows,
  plans,
}: Props) {
  const [items, setItems] = useState(rows);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [query, setQuery] = useState("");

  const filteredAndSorted = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (!normalized) return true;

      const haystack = [
        item.name ?? "",
        item.email,
        item.currentPlan?.name ?? "",
        item.currentPlan?.slug ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
      const aPlanPriority = planPrioritySlug(a.currentPlan?.slug);
      const bPlanPriority = planPrioritySlug(b.currentPlan?.slug);

      if (aPlanPriority !== bPlanPriority) {
        return aPlanPriority - bPlanPriority;
      }

      if (a.lifetimeFree !== b.lifetimeFree) {
        return a.lifetimeFree ? -1 : 1;
      }

      return a.email.localeCompare(b.email);
    });
  }, [items, query]);

  const totalProviders = items.length;
  const premiumCount = items.filter(
    (item) => item.currentPlan?.slug === "premium",
  ).length;
  const basicCount = items.filter(
    (item) => item.currentPlan?.slug === "basic",
  ).length;
  const trialCount = items.filter(
    (item) => item.currentPlan?.slug === "free-trial",
  ).length;
  const lifetimeCount = items.filter((item) => item.lifetimeFree).length;
  const approvedCount = items.filter((item) => item.isApproved).length;

  async function toggleLifetimeFree(userId: string, enabled: boolean) {
    const key = `lifetime:${userId}`;
    setBusyKey(key);
    setFeedback(null);

    try {
      const res = await csrfFetch("/api/admin/providers/lifetime-free", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          enabled,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Nepavyko atnaujinti lifetime statuso.");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.userId === userId
            ? {
                ...item,
                lifetimeFree: enabled,
                lifetimeFreeGrantedAt: enabled
                  ? new Date().toISOString()
                  : null,
              }
            : item,
        ),
      );

      setFeedback({
        type: "success",
        text: enabled
          ? "Lifetime free sėkmingai įjungtas."
          : "Lifetime free sėkmingai nuimtas.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Įvyko klaida atnaujinant lifetime statusą.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function setPlan(userId: string, planSlug: string | null) {
    const key = `plan:${userId}`;
    setBusyKey(key);
    setFeedback(null);

    try {
      const res = await csrfFetch("/api/admin/providers/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          planSlug,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Nepavyko atnaujinti plano.");
      }

      const selectedPlan = planSlug
        ? plans.find((plan) => plan.slug === planSlug) ?? null
        : null;

      const nextTrialEndsAt =
        selectedPlan?.isTrial && (selectedPlan.trialDays ?? 0) > 0
          ? new Date(
              Date.now() +
                (selectedPlan.trialDays ?? 0) * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null;

      setItems((prev) =>
        prev.map((item) =>
          item.userId === userId
            ? {
                ...item,
                currentPlan: selectedPlan
                  ? {
                      id: selectedPlan.id,
                      slug: selectedPlan.slug,
                      name: selectedPlan.name,
                      priceNok: selectedPlan.priceNok,
                      period: selectedPlan.period,
                      highlight: selectedPlan.highlight,
                      isTrial: selectedPlan.isTrial,
                      trialDays: selectedPlan.trialDays,
                      maxListings: selectedPlan.maxListings,
                      maxImagesPerListing: selectedPlan.maxImagesPerListing,
                      canAppearOnHomepage: selectedPlan.canAppearOnHomepage,
                      canBecomeTop: selectedPlan.canBecomeTop,
                    }
                  : null,
                trialEndsAt: nextTrialEndsAt,
              }
            : item,
        ),
      );

      setFeedback({
        type: "success",
        text: selectedPlan
          ? `Planas pakeistas į „${selectedPlan.name}“.`
          : "Planas sėkmingai nuimtas.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Įvyko klaida atnaujinant planą.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <section className={styles.heroCard}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}>PLANS</div>
          <h1 className={styles.title}>Planų ir providerių valdymas</h1>
          <p className={styles.subtitle}>
            Čia gali rankiniu būdu priskirti Free Trial, Basic arba Premium planą,
            stebėti trial pabaigą ir valdyti lifetime free kaip billing išimtį.
          </p>
        </div>
        <div className={styles.heroGlow} aria-hidden="true" />
      </section>

      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statAll}`}>
          <div className={styles.statLabel}>Provideriai</div>
          <div className={styles.statValue}>{totalProviders}</div>
          <div className={styles.statHint}>Visi rodomi provideriai</div>
        </div>

        <div className={`${styles.statCard} ${styles.statPremium}`}>
          <div className={styles.statLabel}>Premium</div>
          <div className={styles.statValue}>{premiumCount}</div>
          <div className={styles.statHint}>Su premium planu</div>
        </div>

        <div className={`${styles.statCard} ${styles.statBasic}`}>
          <div className={styles.statLabel}>Basic</div>
          <div className={styles.statValue}>{basicCount}</div>
          <div className={styles.statHint}>Su basic planu</div>
        </div>

        <div className={`${styles.statCard} ${styles.statTrial}`}>
          <div className={styles.statLabel}>Free Trial</div>
          <div className={styles.statValue}>{trialCount}</div>
          <div className={styles.statHint}>Trial naudotojai</div>
        </div>

        <div className={`${styles.statCard} ${styles.statLifetime}`}>
          <div className={styles.statLabel}>Lifetime free</div>
          <div className={styles.statValue}>{lifetimeCount}</div>
          <div className={styles.statHint}>Nemoka už planą</div>
        </div>

        <div className={`${styles.statCard} ${styles.statApproved}`}>
          <div className={styles.statLabel}>Patvirtinti</div>
          <div className={styles.statValue}>{approvedCount}</div>
          <div className={styles.statHint}>Patvirtinti teikėjai</div>
        </div>
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Ieškoti pagal vardą, el. paštą ar planą..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {feedback && (
        <div className={feedback.type === "error" ? styles.error : styles.success}>
          {feedback.text}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vartotojas</th>
                <th>Patvirtintas</th>
                <th>Skelbimai</th>
                <th>Dabartinis planas</th>
                <th>Plano galimybės</th>
                <th>Trial pabaiga</th>
                <th>Lifetime free</th>
                <th>Suteikta</th>
                <th>Priskirti planą</th>
                <th>Lifetime veiksmas</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSorted.map((row) => {
                const planBusy = busyKey === `plan:${row.userId}`;
                const lifetimeBusy = busyKey === `lifetime:${row.userId}`;

                return (
                  <tr key={row.userId}>
                    <td>
                      <div className={styles.userBlock}>
                        <div className={styles.userName}>
                          {row.name?.trim() || "—"}
                        </div>
                        <div className={styles.userEmail}>{row.email}</div>
                        <div className={styles.userMeta}>
                          Sukurta: {new Date(row.createdAt).toLocaleString("lt-LT")}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          row.isApproved
                            ? styles.badgeApproved
                            : styles.badgeMuted
                        }
                      >
                        {row.isApproved ? "Taip" : "Ne"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.countBadge}>{row.servicesCount}</span>
                    </td>

                    <td>
                      {row.currentPlan ? (
                        <div className={styles.planCell}>
                          <span
                            className={
                              row.currentPlan.slug === "premium"
                                ? styles.badgePremium
                                : row.currentPlan.isTrial
                                  ? styles.badgeTrial
                                  : styles.badgePlan
                            }
                          >
                            {row.currentPlan.name}
                          </span>

                          <div className={styles.planMeta}>
                            {row.currentPlan.priceNok} NOK ·{" "}
                            {formatPeriod(row.currentPlan.period)}
                          </div>
                        </div>
                      ) : (
                        <span className={styles.badgeMuted}>Be plano</span>
                      )}
                    </td>

                    <td>
                      {row.currentPlan ? (
                        <div className={styles.featuresCell}>
                          <span className={styles.featurePill}>
                            {row.currentPlan.maxListings ?? "∞"} skelb.
                          </span>
                          <span className={styles.featurePill}>
                            {row.currentPlan.maxImagesPerListing} nuotr.
                          </span>
                          <span
                            className={
                              row.currentPlan.canAppearOnHomepage
                                ? styles.featurePillActive
                                : styles.featurePillMuted
                            }
                          >
                            Homepage
                          </span>
                        </div>
                      ) : (
                        <span className={styles.badgeMuted}>—</span>
                      )}
                    </td>

                    <td>{formatDateTime(row.trialEndsAt)}</td>

                    <td>
                      <span
                        className={
                          row.lifetimeFree
                            ? styles.badgeLifetime
                            : styles.badgeMuted
                        }
                      >
                        {row.lifetimeFree ? "Aktyvuota" : "Ne"}
                      </span>
                    </td>

                    <td>{formatDateTime(row.lifetimeFreeGrantedAt)}</td>

                    <td>
                      <div className={styles.planActions}>
                        <select
                          className={styles.select}
                          value={row.currentPlan?.slug ?? ""}
                          disabled={planBusy || lifetimeBusy}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            void setPlan(row.userId, value || null);
                          }}
                        >
                          <option value="">Be plano</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.slug}>
                              {formatPlanLabel(plan)}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.neutralBtn}`}
                          disabled={planBusy || lifetimeBusy}
                          onClick={() => void setPlan(row.userId, null)}
                        >
                          {planBusy ? "Vykdoma..." : "Nuimti planą"}
                        </button>
                      </div>
                    </td>

                    <td>
                      {row.lifetimeFree ? (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.removeBtn}`}
                          disabled={planBusy || lifetimeBusy}
                          onClick={() =>
                            void toggleLifetimeFree(row.userId, false)
                          }
                        >
                          {lifetimeBusy ? "Vykdoma..." : "Nuimti lifetime"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.addBtn}`}
                          disabled={planBusy || lifetimeBusy}
                          onClick={() =>
                            void toggleLifetimeFree(row.userId, true)
                          }
                        >
                          {lifetimeBusy ? "Vykdoma..." : "Suteikti lifetime"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={10} className={styles.empty}>
                    Providerių nerasta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link href={`/${locale}/admin`} className={styles.backLink}>
        ← Grįžti į admin pradžią
      </Link>
    </div>
  );
}