// src/app/admin/page.tsx
import Link from "next/link";
import AdminGuard from "@/components/auth/AdminGuard";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [
    usersCount,
    providersCount,
    servicesCount,
    activeServices,
    providerRequestsCount,
    auditCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { isApproved: true } }),

    
    prisma.serviceListing.count({ where: { deletedAt: null } }),
    prisma.serviceListing.count({ where: { deletedAt: null, isActive: true } }),

    
    prisma.providerRequest.count(),

    prisma.auditLog.count(),
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
            <strong>{providersCount}</strong>
          </p>

          <p className={styles.text}>
            Paslaugos: <strong>{servicesCount}</strong> (aktyvios:{" "}
            <strong>{activeServices}</strong>)
          </p>

          <p className={styles.text}>
            Provider paraiškos: <strong>{providerRequestsCount}</strong> • Audit įrašai:{" "}
            <strong>{auditCount}</strong>
          </p>
        </section>

        <section className={styles.card} style={{ marginBottom: "24px" }}>
          <h2 className={styles.subtitle}>Paslaugų moderavimas</h2>
          <p className={styles.text}>
            Peržiūrėk visas paslaugas, jas įjunk / išjunk, pažymėk kaip TOP ir
            pašalink netinkamas.
          </p>
          <Link href="/admin/services" className={styles.button}>
            Eiti į paslaugų sąrašą
          </Link>
        </section>

        <section className={styles.card} style={{ marginBottom: "24px" }}>
          <h2 className={styles.subtitle}>Teikėjų paraiškos</h2>
          <p className={styles.text}>
            Peržiūrėk naujas paraiškas tapti teikėju ir patvirtink / atmesk.
          </p>
          <Link href="/admin/provider-requests" className={styles.button}>
            Eiti į paraiškas
          </Link>
        </section>

        <section className={styles.card}>
          <h2 className={styles.subtitle}>Vartotojai ir teikėjai</h2>
          <p className={styles.text}>
            Peržiūrėk registruotus vartotojus, jų rolę ir ar jie turi paslaugų
            teikėjo profilį.
          </p>
          <Link href="/admin/users" className={styles.button}>
            Eiti į vartotojų sąrašą
          </Link>
        </section>
      </main>
    </AdminGuard>
  );
}