// src/app/[locale]/admin/services/page.tsx
import { redirect } from "next/navigation";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { sanitizeStringParam } from "@/lib/validation";
import styles from "../admin.module.css";
import ActionButtons from "./ActionButtons";

export const dynamic = "force-dynamic";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

function asString(v: string | string[] | undefined) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function AdminServicesPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const resolved = await searchParams;

  const statusFilter = asString(resolved.status) ?? "all";
  const qRaw = asString(resolved.q) ?? "";
  const q = sanitizeStringParam(qRaw, 120) ?? "";

  // Always hide soft-deleted rows in admin list
  const where: Prisma.ServiceListingWhereInput = { deletedAt: null };

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

  const [services, allCount, activeCount, inactiveCount] = await Promise.all([
    prisma.serviceListing.findMany({
      where,
      include: {
        city: true,
        category: true,
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceListing.count({ where: { deletedAt: null } }),
    prisma.serviceListing.count({ where: { isActive: true, deletedAt: null } }),
    prisma.serviceListing.count({ where: { isActive: false, deletedAt: null } }),
  ]);

  const shownCount = services.length;
  const actionPath = `/${locale}/admin/services`;

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų moderavimas</h1>
      <p className={styles.subheading}>
        Čia gali matyti ir valdyti visas sistemoje esančias paslaugas.
      </p>

      <form className={styles.filtersRow} method="GET" action={actionPath}>
        <input
          name="q"
          defaultValue={q}
          className={styles.searchInput}
          placeholder="Ieškoti pagal pavadinimą, aprašymą, el. paštą ar miestą."
        />

        <select
          name="status"
          defaultValue={statusFilter}
          className={styles.statusSelect}
        >
          <option value="all">Visi ({allCount})</option>
          <option value="active">Aktyvios ({activeCount})</option>
          <option value="inactive">Išjungtos ({inactiveCount})</option>
        </select>

        <button className={styles.filterButton} type="submit">
          Filtruoti
        </button>
      </form>

      <p className={styles.subheading} style={{ marginTop: 10 }}>
        Rodoma: <strong>{shownCount}</strong>
        {q ? (
          <>
            {" "}
            • Paieška: <strong>{q}</strong>
          </>
        ) : null}
      </p>

      {services.length === 0 ? (
        <p className={styles.empty}>Nėra rezultatų pagal pasirinktus filtrus.</p>
      ) : (
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
                    {s.user?.name
                      ? `${s.user.name} (${s.user.email ?? "be el. pašto"})`
                      : s.user?.email ?? "—"}
                  </td>
                  <td>
                    {s.isActive ? (
                      <span className={styles.statusActive}>AKTYVI</span>
                    ) : (
                      <span className={styles.statusInactive}>NEAKTYVI</span>
                    )}
                  </td>
                  <td>
                    <ActionButtons
                      id={s.id}
                      isActive={s.isActive}
                      highlighted={!!s.highlighted}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LocalizedLink href="/admin" className={styles.backLink}>
        ← Grįžti į admin pradžią
      </LocalizedLink>
    </main>
  );
}