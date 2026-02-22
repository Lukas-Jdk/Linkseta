// src/app/[locale]/admin/provider-requests/page.tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import styles from "../admin.module.css";
import ProviderRequestsAdminTable from "./ProviderRequestsAdminTable";

export const dynamic = "force-dynamic";

interface ProviderRequestsPageProps {
  params: { locale: string };
}

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

type Status = "PENDING" | "APPROVED" | "REJECTED";

export default async function ProviderRequestsAdminPage({
  params,
}: ProviderRequestsPageProps) {
  const locale = safeLocale(params.locale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const requests = await prisma.providerRequest.findMany({
    include: { city: true, category: true },
    orderBy: { createdAt: "desc" },
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

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų teikėjų paraiškos</h1>
      <p className={styles.subheading}>
        Čia matosi visi užpildyti „Tapk paslaugų teikėju“ prašymai.
      </p>

      <section className={styles.tableWrapper}>
        <ProviderRequestsAdminTable initialRequests={safeRequests} />
      </section>
    </main>
  );
}