// src/app/[locale]/admin/providers/ProvidersAdminClient.tsx

"use client";

import { useMemo, useState } from "react";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./providersAdmin.module.css";

type ProviderRow = {
  userId: string;
  email: string;
  name: string | null;
  isApproved: boolean;
  lifetimeFree: boolean;
  lifetimeFreeGrantedAt: string | null;
};

type Props = {
  rows: ProviderRow[];
};

export default function ProvidersAdminClient({ rows }: Props) {
  const [items, setItems] = useState(rows);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.lifetimeFree === b.lifetimeFree) return a.email.localeCompare(b.email);
      return a.lifetimeFree ? -1 : 1;
    });
  }, [items]);

  async function toggleLifetimeFree(userId: string, enabled: boolean) {
    setBusyUserId(userId);
    setError(null);

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
        throw new Error(data?.error || "Nepavyko atnaujinti statuso.");
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Įvyko klaida atnaujinant statusą.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Providerių valdymas</h1>
          <p className={styles.subtitle}>
            Čia gali pirmiems teikėjams suteikti nemokamą naudojimą visam laikui.
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vardas</th>
                <th>El. paštas</th>
                <th>Patvirtintas</th>
                <th>Lifetime free</th>
                <th>Suteikta</th>
                <th>Veiksmas</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((row) => {
                const busy = busyUserId === row.userId;

                return (
                  <tr key={row.userId}>
                    <td>{row.name?.trim() || "—"}</td>
                    <td>{row.email}</td>
                    <td>
                      <span
                        className={
                          row.isApproved ? styles.badgeApproved : styles.badgeMuted
                        }
                      >
                        {row.isApproved ? "Taip" : "Ne"}
                      </span>
                    </td>
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
                    <td>
                      {row.lifetimeFreeGrantedAt
                        ? new Date(row.lifetimeFreeGrantedAt).toLocaleString("lt-LT")
                        : "—"}
                    </td>
                    <td>
                      {row.lifetimeFree ? (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.removeBtn}`}
                          disabled={busy}
                          onClick={() => toggleLifetimeFree(row.userId, false)}
                        >
                          {busy ? "Vykdoma..." : "Nuimti"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.addBtn}`}
                          disabled={busy}
                          onClick={() => toggleLifetimeFree(row.userId, true)}
                        >
                          {busy ? "Vykdoma..." : "Suteikti visam laikui"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Providerių nerasta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}