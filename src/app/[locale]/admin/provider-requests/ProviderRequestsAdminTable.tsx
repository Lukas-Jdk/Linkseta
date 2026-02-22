// src/app/[locale]/admin/provider-requests/ProviderRequestsAdminTable.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./providerRequests.module.css";

type Status = "PENDING" | "APPROVED" | "REJECTED";

type RequestItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cityName: string | null;
  categoryName: string | null;
  message: string | null;
  status: Status;
  createdAt: string | null;
};

type Props = {
  initialRequests: RequestItem[];
};

type Feedback =
  | { type: "success"; text: string }
  | { type: "error"; text: string };

type ApiError = { error?: string; details?: string };

async function readJsonIfPossible(res: Response): Promise<unknown | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as ApiError).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

export default function ProviderRequestsAdminTable({ initialRequests }: Props) {
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      abortRef.current?.abort();
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  function setAutoClearFeedback(next: Feedback | null) {
    setFeedback(next);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    if (next) {
      feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 4000);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      const matchesStatus = statusFilter === "ALL" ? true : r.status === statusFilter;
      if (!matchesStatus) return false;

      if (!q) return true;

      const haystack = [
        r.name,
        r.email,
        r.phone ?? "",
        r.cityName ?? "",
        r.categoryName ?? "",
        r.message ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [requests, search, statusFilter]);

  async function updateStatus(id: string, status: Status) {
    try {
      // cancel previous in-flight request (defensive)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setUpdatingId(id);
      setAutoClearFeedback(null);

      const res = await fetch(`/api/admin/provider-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        signal: controller.signal,
      });

      const json = await readJsonIfPossible(res);

      if (!res.ok) {
        const msg = extractError(json, "Nepavyko atnaujinti statuso. Bandykite dar kartą.");
        console.error("ProviderRequest status update failed:", { id, status, json });
        setAutoClearFeedback({ type: "error", text: msg });
        return;
      }

      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

      setAutoClearFeedback({
        type: "success",
        text: `Statusas atnaujintas į ${status}.`,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return; // user clicked again, ignore
      console.error("updateStatus error", err);
      setAutoClearFeedback({ type: "error", text: "Serverio klaida. Bandykite dar kartą." });
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("lt-LT");
  }

  return (
    <>
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Ieškoti..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "ALL")}
        >
          <option value="ALL">Visi</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {feedback && (
        <p
          className={
            feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess
          }
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>Nėra rezultatų.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vardas</th>
                <th>El. paštas</th>
                <th>Telefonas</th>
                <th>Miestas</th>
                <th>Kategorija</th>
                <th>Statusas</th>
                <th>Žinutė</th>
                <th>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rowBusy = updatingId === r.id;

                return (
                  <tr key={r.id} aria-busy={rowBusy ? "true" : "false"}>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{r.phone || "-"}</td>
                    <td>{r.cityName || "-"}</td>
                    <td>{r.categoryName || "-"}</td>
                    <td>{r.status}</td>
                    <td className={styles.messageCell}>{r.message || "-"}</td>
                    <td>
                      <div className={styles.actions}>
                        {r.status !== "APPROVED" && (
                          <button
                            className={styles.btnApprove}
                            onClick={() => updateStatus(r.id, "APPROVED")}
                            disabled={rowBusy}
                          >
                            {rowBusy ? "..." : "Patvirtinti"}
                          </button>
                        )}

                        {r.status !== "REJECTED" && (
                          <button
                            className={styles.btnReject}
                            onClick={() => updateStatus(r.id, "REJECTED")}
                            disabled={rowBusy}
                          >
                            {rowBusy ? "..." : "Atmesti"}
                          </button>
                        )}

                        {r.status !== "PENDING" && (
                          <button
                            className={styles.btnReset}
                            onClick={() => updateStatus(r.id, "PENDING")}
                            disabled={rowBusy}
                          >
                            {rowBusy ? "..." : "Grąžinti į pending"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}