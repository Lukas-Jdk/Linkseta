// src/app/[locale]/admin/page.tsx
import Link from "next/link";
import AdminGuard from "@/components/auth/AdminGuard";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";
import Metrics7Days from "./Metrics7Days";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDay(d: Date) {
  // "MM-DD" (pakanka grafike)
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

async function countByDay(params: {
  from: Date;
  days: number; // 7
  model: "user" | "service" | "providerRequest";
}) {
  const buckets: number[] = Array(params.days).fill(0);
  const dayStarts: Date[] = Array.from({ length: params.days }, (_, i) =>
    addDays(params.from, i)
  );

  // 7 mažos užklausos – čia OK (adminui, kartą atsidarius)
  // Jei vėliau norėsi – optimizuosim į raw SQL date_trunc.
  for (let i = 0; i < params.days; i++) {
    const gte = dayStarts[i];
    const lt = addDays(gte, 1);

    if (params.model === "user") {
      buckets[i] = await prisma.user.count({ where: { createdAt: { gte, lt } } });
    }

    if (params.model === "providerRequest") {
      buckets[i] = await prisma.providerRequest.count({
        where: { createdAt: { gte, lt } },
      });
    }

    if (params.model === "service") {
      buckets[i] = await prisma.serviceListing.count({
        where: {
          createdAt: { gte, lt },
          deletedAt: null, 
        },
      });
    }
  }

  return buckets;
}

export default async function AdminHomePage() {
  //  bendri skaičiai (su soft-delete)
  const [usersCount, providersCount, servicesCount, activeServices] =
    await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.serviceListing.count({ where: { deletedAt: null } }),
      prisma.serviceListing.count({ where: { isActive: true, deletedAt: null } }),
    ]);

  //  7 dienų grafikas
  const today = startOfDay(new Date());
  const from = addDays(today, -6); // 7 dienos: from..today

  const days = Array.from({ length: 7 }, (_, i) => fmtDay(addDays(from, i)));

  const [users7, services7, requests7] = await Promise.all([
    countByDay({ from, days: 7, model: "user" }),
    countByDay({ from, days: 7, model: "service" }),
    countByDay({ from, days: 7, model: "providerRequest" }),
  ]);

  return (
    <AdminGuard>
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Admin valdymo skydas</h1>
        
        {/*  7 dienų grafikas */}
        <div style={{ marginBottom: "24px" }}>
          <Metrics7Days
            days={days}
            series={[
              { label: "Vartotojai", values: users7 },
              { label: "Paslaugos", values: services7 },
              { label: "Paraiškos", values: requests7 },
            ]}
          />
        </div>

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
            sutvarkyk netinkamas.
          </p>
          <Link href="/admin/services" className={styles.button}>
            Eiti į paslaugų sąrašą
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