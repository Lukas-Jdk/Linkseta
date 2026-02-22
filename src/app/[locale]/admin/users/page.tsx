// src/app/[locale]/admin/users/page.tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

export default async function AdminUsersPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Vartotojų sąrašas</h1>
      <p className={styles.subheading}>
        Čia matosi visi registruoti vartotojai, jų rolės ir ar jie turi patvirtintą
        paslaugų teikėjo profilį.
      </p>

      {safeUsers.length === 0 ? (
        <p className={styles.empty}>Kol kas nėra nė vieno vartotojo.</p>
      ) : (
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
                        ? "Patvirtintas"
                        : "Ne patvirtintas"
                      : "Ne teikėjas"}
                  </td>
                  <td>{u.servicesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}