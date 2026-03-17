// src/app/[locale]/admin/users/page.tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const PAGE_SIZE = 50;

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

function parsePage(v: string | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const resolved = await searchParams;
  const page = parsePage(asString(resolved.page));

  const totalUsers = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      profile: { select: { isApproved: true } },
      _count: { select: { services: true } },
    },
  });

  const safeUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    isProvider: Boolean(u.profile),
    isApprovedProvider: u.profile?.isApproved ?? false,
    servicesCount: u._count.services,
  }));

  const basePath = `/${locale}/admin/users`;
  const buildPageHref = (nextPage: number) =>
    nextPage <= 1 ? basePath : `${basePath}?page=${nextPage}`;

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Vartotojų sąrašas</h1>
      <p className={styles.subheading}>
        Čia matosi visi registruoti vartotojai, jų rolės ir ar jie turi patvirtintą
        paslaugų teikėjo profilį.
      </p>

      <p className={styles.subheading}>
        Rodoma: <strong>{safeUsers.length}</strong> iš <strong>{totalUsers}</strong> • Puslapis{" "}
        <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
      </p>

      {safeUsers.length === 0 ? (
        <p className={styles.empty}>Kol kas nėra nė vieno vartotojo.</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>El. paštas</th>
                  <th>Vardas</th>
                  <th>Telefonas</th>
                  <th>Rolė</th>
                  <th>Teikėjas</th>
                  <th>Skelbimų sk.</th>
                </tr>
              </thead>
              <tbody>
                {safeUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{new Date(u.createdAt).toLocaleString("lt-LT")}</td>
                    <td>{u.email}</td>
                    <td>{u.name ?? "—"}</td>
                    <td>{u.phone ?? "—"}</td>
                    <td>{u.role}</td>
                    <td>
                      {u.isProvider
                        ? u.isApprovedProvider
                          ? "Aktyvus teikėjas"
                          : "Neaktyvus teikėjas"
                        : "Ne teikėjas"}
                    </td>
                    <td>{u.servicesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.filtersRow} style={{ marginTop: 14 }}>
              {currentPage > 1 ? (
                <LocalizedLink href={buildPageHref(currentPage - 1)} className={styles.button}>
                  ← Ankstesnis
                </LocalizedLink>
              ) : (
                <span />
              )}

              <span className={styles.subheading}>
                Puslapis {currentPage} iš {totalPages}
              </span>

              {currentPage < totalPages ? (
                <LocalizedLink href={buildPageHref(currentPage + 1)} className={styles.button}>
                  Kitas →
                </LocalizedLink>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}