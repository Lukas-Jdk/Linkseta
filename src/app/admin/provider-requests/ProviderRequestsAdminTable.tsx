// src/app/admin/provider-requests/ProviderRequestsAdminTable.tsx
"use client";

import { useMemo, useState } from "react";
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
  createdAt: string | null; // ISO
};

type Props = {
  initialRequests: RequestItem[];
};

export default function ProviderRequestsAdminTable({ initialRequests }: Props) {
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : r.status === statusFilter;

      const haystack = [
        r.name,
        r.email,
        r.phone,
        r.cityName,
        r.categoryName,
        r.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = q === "" ? true : haystack.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  async function updateStatus(id: string, status: Status) {
    try {
      setUpdatingId(id);

      const res = await fetch(`/api/admin/provider-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        console.error("Nepavyko atnaujinti statuso", await res.text());
        return;
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error("updateStatus error", err);
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("lt-LT");
  }

  return (
    <>
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Ieškoti pagal vardą, el. paštą, miestą..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as Status | "ALL")
          }
        >
          <option value="ALL">Visi statusai</option>
          <option value="PENDING">Tik PENDING</option>
          <option value="APPROVED">Tik APPROVED</option>
          <option value="REJECTED">Tik REJECTED</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>Pagal pasirinktus filtrus paraiškų nėra.</p>
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
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.phone || "-"}</td>
                  <td>{r.cityName || "-"}</td>
                  <td>{r.categoryName || "-"}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        r.status === "PENDING"
                          ? styles.badgePending
                          : r.status === "APPROVED"
                          ? styles.badgeApproved
                          : styles.badgeRejected
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className={styles.messageCell}>
                    {r.message || "-"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {r.status !== "APPROVED" && (
                        <button
                          className={styles.btnApprove}
                          onClick={() => updateStatus(r.id, "APPROVED")}
                          disabled={updatingId === r.id}
                        >
                          Patvirtinti
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button
                          className={styles.btnReject}
                          onClick={() => updateStatus(r.id, "REJECTED")}
                          disabled={updatingId === r.id}
                        >
                          Atmesti
                        </button>
                      )}
                      {r.status !== "PENDING" && (
                        <button
                          className={styles.btnReset}
                          onClick={() => updateStatus(r.id, "PENDING")}
                          disabled={updatingId === r.id}
                        >
                          Į PENDING
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
