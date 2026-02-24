// src/app/[locale]/admin/services/AdminServicesTable.tsx
"use client";

import { useState } from "react";
import styles from "../admin.module.css";
import { csrfFetch } from "@/lib/csrfClient";

type ServiceRow = {
  id: string;
  title: string;
  createdAt: string;
  cityName: string;
  categoryName: string;
  priceFrom: number | null;
  userEmail: string;
  userName: string;
  isActive: boolean;
};

type Props = {
  initialServices: ServiceRow[];
};

type Feedback =
  | { type: "success"; text: string }
  | { type: "error"; text: string };

type ApiError = { error?: string };

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as ApiError).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

export default function AdminServicesTable({ initialServices }: Props) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleDelete(id: string) {
    const service = services.find((s) => s.id === id);
    const title = service?.title ?? "paslauga";

    if (!confirm(`Ar tikrai nori ištrinti: "${title}"?`)) return;

    setFeedback(null);
    setLoadingIds((prev) => [...prev, id]);

    try {
      const res = await csrfFetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Admin delete failed:", json);
        setFeedback({
          type: "error",
          text: extractError(json, "Nepavyko ištrinti paslaugos."),
        });
        return;
      }

      setServices((prev) => prev.filter((s) => s.id !== id));
      setFeedback({
        type: "success",
        text: `Paslauga „${title}“ sėkmingai ištrinta.`,
      });
    } catch (err) {
      console.error("Admin delete error:", err);
      setFeedback({
        type: "error",
        text: "Įvyko klaida bandant ištrinti paslaugą.",
      });
    } finally {
      setLoadingIds((prev) => prev.filter((x) => x !== id));
    }
  }

  if (services.length === 0) {
    return (
      <>
        {feedback && (
          <p
            className={
              feedback.type === "error"
                ? styles.feedbackError
                : styles.feedbackSuccess
            }
          >
            {feedback.text}
          </p>
        )}
        <p className={styles.text}>Šiuo metu paslaugų nėra.</p>
      </>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      {feedback && (
        <p
          className={
            feedback.type === "error"
              ? styles.feedbackError
              : styles.feedbackSuccess
          }
        >
          {feedback.text}
        </p>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Pavadinimas</th>
            <th>Miestas</th>
            <th>Kategorija</th>
            <th>Kaina nuo</th>
            <th>Vartotojas</th>
            <th>Statusas</th>
            <th>Veiksmai</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            const busy = loadingIds.includes(s.id);

            return (
              <tr key={s.id} aria-busy={busy ? "true" : "false"}>
                <td>{new Date(s.createdAt).toLocaleString("lt-LT")}</td>
                <td>{s.title}</td>
                <td>{s.cityName || "—"}</td>
                <td>{s.categoryName || "—"}</td>
                <td>{s.priceFrom != null ? `${s.priceFrom} NOK` : "—"}</td>
                <td>
                  {s.userName
                    ? `${s.userName} (${s.userEmail || "be el. pašto"})`
                    : s.userEmail || "—"}
                </td>
                <td>
                  {s.isActive ? (
                    <span className={styles.statusActive}>AKTYVI</span>
                  ) : (
                    <span className={styles.statusInactive}>NEAKTYVI</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => handleDelete(s.id)}
                    disabled={busy}
                  >
                    {busy ? "Šalinama..." : "Ištrinti"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}