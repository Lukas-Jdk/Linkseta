// src/app/admin/services/page.tsx
import { prisma } from "@/lib/prisma";
import styles from "../provider-requests/provider-requests.module.css"; // tas pats css
import Link from "next/link";
import ActionButtons from "./ActionButtons"; // 👈 NAUJAS klientinis komponentas

export const dynamic = "force-dynamic";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AdminServicesPage({ searchParams }: PageProps) {
  const resolved = await searchParams;

  const statusFilter = (resolved.status as string | undefined) ?? "all";
  const q = (resolved.q as string | undefined) ?? "";

  const where: any = {};

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { city: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const services = await prisma.serviceListing.findMany({
    where,
    include: {
      city: true,
      category: true,
      user: {
        select: { email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = await prisma.serviceListing.count({
    where: { isActive: true },
  });
  const inactiveCount = await prisma.serviceListing.count({
    where: { isActive: false },
  });

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų moderavimas</h1>
      <p className={styles.subheading}>
        Čia gali matyti ir valdyti visas sistemoje esančias paslaugas.
      </p>

      <form className={styles.filtersRow}>
        <input
          name="q"
          defaultValue={q}
          className={styles.searchInput}
          placeholder="Ieškoti pagal pavadinimą, aprašymą, el. paštą ar miestą..."
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className={styles.statusSelect}
        >
          <option value="all">Visi ({services.length})</option>
          <option value="active">Aktyvios ({activeCount})</option>
          <option value="inactive">Išjungtos ({inactiveCount})</option>
        </select>
        <button className={styles.filterButton} type="submit">
          Filtruoti
        </button>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pavadinimas</th>
              <th>Miestas</th>
              <th>Kategorija</th>
              <th>Savininkas</th>
              <th>Kaina nuo</th>
              <th>Statusas</th>
              <th>Highlight</th>
              <th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <div>
                    <div>{s.title}</div>
                    <small className={styles.mutedText}>
                      <Link href={`/services/${s.slug}`} target="_blank">
                        Peržiūrėti puslapį
                      </Link>
                    </small>
                  </div>
                </td>
                <td>{s.city?.name ?? "-"}</td>
                <td>{s.category?.name ?? "-"}</td>
                <td>
                  {s.user
                    ? `${s.user.name || "Nežinomas"} (${s.user.email})`
                    : "–"}
                </td>
                <td>{s.priceFrom != null ? `${s.priceFrom} NOK` : "–"}</td>
                <td>
                  <span
                    className={
                      s.isActive ? styles.statusApproved : styles.statusRejected
                    }
                  >
                    {s.isActive ? "AKTYVI" : "IŠJUNGTA"}
                  </span>
                </td>
                <td>
                  {s.highlighted ? (
                    <span className={styles.statusHighlighted}>TOP</span>
                  ) : (
                    <span className={styles.statusPending}>NE</span>
                  )}
                </td>
                <td>
                  <ActionButtons
                    id={s.id}
                    isActive={s.isActive}
                    highlighted={s.highlighted}
                  />
                </td>
              </tr>
            ))}

            {services.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  Pagal pasirinktus filtrus paslaugų nėra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
