// src/app/admin/services/AdminServicesTable.tsx
"use client";

import { useState } from "react";
import styles from "../admin.module.css";

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

export default function AdminServicesTable({ initialServices }: Props) {
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  async function handleDelete(id: string) {
    const service = services.find((s) => s.id === id);
    const title = service?.title ?? "paslauga";

    if (!confirm(`Ar tikrai nori ištrinti: "${title}"?`)) return;

    setLoadingIds((prev) => [...prev, id]);

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("Delete failed:", json);
        alert("Nepavyko ištrinti paslaugos.");
        return;
      }

      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Įvyko klaida bandant ištrinti paslaugą.");
    } finally {
      setLoadingIds((prev) => prev.filter((x) => x !== id));
    }
  }

  if (services.length === 0) {
    return <p className={styles.text}>Šiuo metu paslaugų nėra.</p>;
  }

  return (
    <div className={styles.tableWrapper}>
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
          {services.map((s) => (
            <tr key={s.id}>
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
                  disabled={loadingIds.includes(s.id)}
                >
                  {loadingIds.includes(s.id) ? "Šalinama..." : "Ištrinti"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
