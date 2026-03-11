// src/app/[locale]/admin/provider-requests/page.tsx
import { redirect } from "next/navigation";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import styles from "../admin.module.css";
import ProviderRequestsAdminTable from "./ProviderRequestsAdminTable";

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

type Status = "PENDING" | "APPROVED" | "REJECTED";

export default async function ProviderRequestsAdminPage({
  params,
  searchParams,
}: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const resolved = await searchParams;
  const page = parsePage(asString(resolved.page));

  const totalRequests = await prisma.providerRequest.count();
  const totalPages = Math.max(1, Math.ceil(totalRequests / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const requests = await prisma.providerRequest.findMany({
    include: { city: true, category: true },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const safeRequests = requests.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    cityName: r.city?.name ?? null,
    categoryName: r.category?.name ?? null,
    message: r.message,
    status: r.status as Status,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  }));

  const basePath = `/${locale}/admin/provider-requests`;
  const buildPageHref = (nextPage: number) =>
    nextPage <= 1 ? basePath : `${basePath}?page=${nextPage}`;

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų teikėjų paraiškos</h1>
      <p className={styles.subheading}>
        Čia matosi visi užpildyti „Tapk paslaugų teikėju“ prašymai.
      </p>

      <p className={styles.subheading}>
        Rodoma: <strong>{safeRequests.length}</strong> iš{" "}
        <strong>{totalRequests}</strong> • Puslapis{" "}
        <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
      </p>

      <section className={styles.tableWrapper}>
        <ProviderRequestsAdminTable initialRequests={safeRequests} />
      </section>

      {totalPages > 1 && (
        <div className={styles.filtersRow} style={{ marginTop: 14 }}>
          {currentPage > 1 ? (
            <LocalizedLink
              href={buildPageHref(currentPage - 1)}
              className={styles.button}
            >
              ← Ankstesnis
            </LocalizedLink>
          ) : (
            <span />
          )}

          <span className={styles.subheading}>
            Puslapis {currentPage} iš {totalPages}
          </span>

          {currentPage < totalPages ? (
            <LocalizedLink
              href={buildPageHref(currentPage + 1)}
              className={styles.button}
            >
              Kitas →
            </LocalizedLink>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}