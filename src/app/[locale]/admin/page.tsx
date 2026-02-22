// src/app/[locale]/admin/page.tsx
import { redirect } from "next/navigation";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import styles from "./admin.module.css";
import Metrics7Days from "./Metrics7Days";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  params: { locale: string };
}

// UTC helpers
function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function fmtDayUTC(d: Date) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

async function countByDay(params: {
  from: Date;
  days: number;
  model: "user" | "service" | "providerRequest";
}) {
  const fromUtc = params.from;
  const toUtc = addDaysUTC(fromUtc, params.days);

  let rows: Array<{ day: string; count: number }> = [];

  if (params.model === "service") {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "ServiceListing"
      WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
        AND "deletedAt" IS NULL
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  } else if (params.model === "providerRequest") {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "ProviderRequest"
      WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  } else {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  }

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(String(r.day), Number(r.count ?? 0)); // r.day: YYYY-MM-DD
  }

  const buckets: number[] = Array(params.days).fill(0);
  for (let i = 0; i < params.days; i++) {
    const day = addDaysUTC(params.from, i);
    const dayKey = day.toISOString().slice(0, 10); // YYYY-MM-DD
    buckets[i] = map.get(dayKey) ?? 0;
  }

  return buckets;
}

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

export default async function AdminHomePage({ params }: AdminPageProps) {
  const locale = safeLocale(params.locale);

  // Server-side protection
  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const [usersCount, providersCount, servicesCount, activeServices] =
    await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.serviceListing.count({ where: { deletedAt: null } }),
      prisma.serviceListing.count({ where: { isActive: true, deletedAt: null } }),
    ]);

  const now = new Date();
  const today = startOfDayUTC(now);
  const from = addDaysUTC(today, -6);

  const days = Array.from({ length: 7 }, (_, i) => fmtDayUTC(addDaysUTC(from, i)));

  const [users7, services7, requests7] = await Promise.all([
    countByDay({ from, days: 7, model: "user" }),
    countByDay({ from, days: 7, model: "service" }),
    countByDay({ from, days: 7, model: "providerRequest" }),
  ]);

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.title}>Admin valdymo skydas</h1>

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
          <strong>{servicesCount}</strong> (aktyvios: <strong>{activeServices}</strong>)
        </p>
      </section>

      <section className={styles.card} style={{ marginBottom: "24px" }}>
        <h2 className={styles.subtitle}>Paslaugų moderavimas</h2>
        <p className={styles.text}>
          Peržiūrėk visas paslaugas, jas įjunk / išjunk, pažymėk kaip TOP ir sutvarkyk
          netinkamas.
        </p>
        <LocalizedLink href="/admin/services" className={styles.button}>
          Eiti į paslaugų sąrašą
        </LocalizedLink>
      </section>

      <section className={styles.card}>
        <h2 className={styles.subtitle}>Vartotojai ir teikėjai</h2>
        <p className={styles.text}>
          Peržiūrėk registruotus vartotojus, jų rolę ir ar jie turi paslaugų teikėjo profilį.
        </p>
        <LocalizedLink href="/admin/users" className={styles.button}>
          Eiti į vartotojų sąrašą
        </LocalizedLink>
      </section>
    </main>
  );
}