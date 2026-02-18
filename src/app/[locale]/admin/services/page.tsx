//  src/app/[locale]/admin/services/page.tsx
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import styles from "../provider-requests/provider-requests.module.css";
import ActionButtons from "./ActionButtons";

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

  const where: Prisma.ServiceListingWhereInput = {};

  if (statusFilter === "active") where.isActive = true;
  if (statusFilter === "inactive") where.isActive = false;

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { city: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [services, activeCount, inactiveCount] = await Promise.all([
    prisma.serviceListing.findMany({
      where,
      include: {
        city: true,
        category: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceListing.count({ where: { isActive: true } }),
    prisma.serviceListing.count({ where: { isActive: false } }),
  ]);

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų moderavimas</h1>
      <p className={styles.subheading}>Čia gali matyti ir valdyti visas sistemoje esančias paslaugas.</p>

      <form className={styles.filtersRow}>
        <input
          name="q"
          defaultValue={q}
          className={styles.searchInput}
          placeholder="Ieškoti pagal pavadinimą, aprašymą, el. paštą ar miestą."
        />
        <select name="status" defaultValue={statusFilter} className={styles.statusSelect}>
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
                <td>{s.city?.name ?? "—"}</td>
                <td>{s.category?.name ?? "—"}</td>
                <td>{s.priceFrom != null ? `${s.priceFrom} NOK` : "—"}</td>
                <td>
                  {s.user?.name ? `${s.user.name} (${s.user.email ?? "be el. pašto"})` : s.user?.email ?? "—"}
                </td>
                <td>
                  {s.isActive ? (
                    <span className={styles.statusActive}>AKTYVI</span>
                  ) : (
                    <span className={styles.statusInactive}>NEAKTYVI</span>
                  )}
                </td>
                <td>
                  <ActionButtons id={s.id} isActive={s.isActive} highlighted={s.highlighted ?? false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/admin" className={styles.backLink}>
        ← Grįžti į admin pradžią
      </Link>
    </main>
  );
}
