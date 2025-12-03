// src/app/admin/users/page.tsx
import AdminGuard from "@/components/auth/AdminGuard";
import { prisma } from "@/lib/prisma";
import styles from "../provider-requests/provider-requests.module.css";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,   // ProviderProfile?
      services: true,  // ServiceListing[]
    },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    isProvider: !!u.profile,
    isApprovedProvider: u.profile?.isApproved ?? false,
    servicesCount: u.services.length,
  }));

  return (
    <AdminGuard>
      <main className={styles.wrapper}>
        <h1 className={styles.heading}>Vartotojų sąrašas</h1>
        <p className={styles.subheading}>
          Čia matosi visi registruoti vartotojai, jų rolės ir ar jie turi
          patvirtintą paslaugų teikėjo profilį.
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
                    <td>
                      {new Date(u.createdAt).toLocaleString("lt-LT")}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.name ?? "—"}</td>
                    <td>{u.phone ?? "—"}</td>
                    <td>{u.role}</td>
                    <td>
                      {u.isProvider ? (
                        u.isApprovedProvider ? "Patvirtintas" : "Ne patvirtintas"
                      ) : (
                        "Ne teikėjas"
                      )}
                    </td>
                    <td>{u.servicesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}
