// src/app/admin/page.tsx
import Link from "next/link";
import AdminGuard from "@/components/auth/AdminGuard";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [usersCount, providersCount, servicesCount, activeServices] =
    await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.serviceListing.count(),
      prisma.serviceListing.count({ where: { isActive: true } }),
    ]);

  return (
    <AdminGuard>
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Admin valdymo skydas</h1>

        <p className={styles.text}>
          Čia gali matyti pagrindinę sistemos statistiką ir valdyti turinį.
        </p>

        <section className={styles.card} style={{ marginBottom: "24px" }}>
          <h2 className={styles.subtitle}>Greita statistika</h2>
          <p className={styles.text}>
            Vartotojai: <strong>{usersCount}</strong> • Patvirtinti teikėjai:{" "}
            <strong>{providersCount}</strong> • Paslaugos:{" "}
            <strong>{servicesCount}</strong> (aktyvios:{" "}
            <strong>{activeServices}</strong>)
          </p>
        </section>

        <section className={styles.card} style={{ marginBottom: "24px" }}>
          <h2 className={styles.subtitle}>Paslaugų moderavimas</h2>
          <p className={styles.text}>
            Peržiūrėk visas paslaugas, jas įjunk / išjunk, pažymėk kaip TOP ir
            ištrink netinkamas.
          </p>
          <Link href="/admin/services" className={styles.button}>
            Eiti į paslaugų sąrašą
          </Link>
        </section>

        <section className={styles.card}>
          <h2 className={styles.subtitle}>Vartotojai ir teikėjai</h2>
          <p className={styles.text}>
            Peržiūrėk registruotus vartotojus, jų rolę ir ar jie turi
            paslaugų teikėjo profilį.
          </p>
          <Link href="/admin/users" className={styles.button}>
            Eiti į vartotojų sąrašą
          </Link>
        </section>
      </main>
    </AdminGuard>
  );
}
