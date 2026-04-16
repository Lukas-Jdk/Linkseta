// src/app/[locale]/admin/page.tsx
import { redirect } from "next/navigation";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import styles from "./admin.module.css";
import Metrics7Days from "./Metrics7Days";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

function startOfDayUTC(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
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

async function countByDay(args: {
  from: Date;
  days: number;
  model: "user" | "service" | "providerRequest";
}) {
  const fromUtc = args.from;
  const toUtc = addDaysUTC(fromUtc, args.days);

  let rows: Array<{ day: string; count: number }> = [];

  if (args.model === "service") {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "ServiceListing"
      WHERE "createdAt" >= ${fromUtc}
        AND "createdAt" < ${toUtc}
        AND "deletedAt" IS NULL
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  } else if (args.model === "providerRequest") {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "ProviderRequest"
      WHERE "createdAt" >= ${fromUtc}
        AND "createdAt" < ${toUtc}
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  } else {
    rows = (await prisma.$queryRaw`
      SELECT (date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date AS day,
             COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${fromUtc}
        AND "createdAt" < ${toUtc}
      GROUP BY day
      ORDER BY day
    `) as Array<{ day: string; count: number }>;
  }

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(String(r.day), Number(r.count ?? 0));
  }

  return Array.from({ length: args.days }, (_, i) => {
    const day = addDaysUTC(args.from, i).toISOString().slice(0, 10);
    return map.get(day) ?? 0;
  });
}

export default async function AdminHomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const now = new Date();
  const today = startOfDayUTC(now);
  const from = addDaysUTC(today, -6);

  const days = Array.from({ length: 7 }, (_, i) =>
    fmtDayUTC(addDaysUTC(from, i)),
  );

  const [
    usersCount,
    providersCount,
    servicesCount,
    activeServices,
    users7,
    services7,
    requests7,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { isApproved: true } }),
    prisma.serviceListing.count({ where: { deletedAt: null } }),
    prisma.serviceListing.count({ where: { isActive: true, deletedAt: null } }),
    countByDay({ from, days: 7, model: "user" }),
    countByDay({ from, days: 7, model: "service" }),
    countByDay({ from, days: 7, model: "providerRequest" }),
  ]);

  return (
    <main className={styles.wrapper}>
      <section className={styles.heroCard}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}>ADMIN</div>
          <h1 className={styles.title}>Admin valdymo skydas</h1>
          <p className={styles.subtitle}>
            Čia greitai matysi pagrindinę statistiką, naujų įrašų judėjimą ir
            svarbiausius veiksmus: paslaugų moderavimą, vartotojų priežiūrą bei
            planų valdymą.
          </p>
        </div>

        <div className={styles.heroGlow} aria-hidden="true" />
      </section>

      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statUsers}`}>
          <div className={styles.statLabel}>Vartotojai</div>
          <div className={styles.statValue}>{usersCount}</div>
          <div className={styles.statHint}>Visi registruoti vartotojai</div>
        </div>

        <div className={`${styles.statCard} ${styles.statProviders}`}>
          <div className={styles.statLabel}>Patvirtinti teikėjai</div>
          <div className={styles.statValue}>{providersCount}</div>
          <div className={styles.statHint}>Aktyvūs provider profiliai</div>
        </div>

        <div className={`${styles.statCard} ${styles.statServices}`}>
          <div className={styles.statLabel}>Paslaugos</div>
          <div className={styles.statValue}>{servicesCount}</div>
          <div className={styles.statHint}>Visi neištrinti skelbimai</div>
        </div>

        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statLabel}>Aktyvios paslaugos</div>
          <div className={styles.statValue}>{activeServices}</div>
          <div className={styles.statHint}>Šiuo metu viešai rodomos</div>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <Metrics7Days
          days={days}
          series={[
            { label: "Vartotojai", values: users7 },
            { label: "Paslaugos", values: services7 },
            { label: "Paraiškos", values: requests7 },
          ]}
        />
      </section>

      <section className={styles.actionsGrid}>
        <article className={`${styles.actionCard} ${styles.actionCardBlue}`}>
          <div className={styles.actionBadge}>01</div>
          <h2 className={styles.actionTitle}>Paslaugų moderavimas</h2>
          <p className={styles.text}>
            Peržiūrėk visas paslaugas, įjunk arba išjunk jų aktyvumą, pažymėk
            TOP ir greitai susitvarkyk netinkamą turinį.
          </p>
          <LocalizedLink href="/admin/services" className={styles.actionButton}>
            Eiti į paslaugų sąrašą
          </LocalizedLink>
        </article>

        <article className={`${styles.actionCard} ${styles.actionCardViolet}`}>
          <div className={styles.actionBadge}>02</div>
          <h2 className={styles.actionTitle}>Vartotojai ir teikėjai</h2>
          <p className={styles.text}>
            Matyk registruotus vartotojus, jų rolę, ar jie turi provider profilį
            ir kiek paslaugų yra sukūrę.
          </p>
          <LocalizedLink href="/admin/users" className={styles.actionButton}>
            Eiti į vartotojų sąrašą
          </LocalizedLink>
        </article>

        <article className={`${styles.actionCard} ${styles.actionCardOrange}`}>
          <div className={styles.actionBadge}>03</div>
          <h2 className={styles.actionTitle}>Planai ir akcijos</h2>
          <p className={styles.text}>
            Rankiniu būdu priskirk Free Trial, Basic, Premium ar Beta planą,
            įjunk lifetime free pirmiems klientams ir pasiruošk payment
            integracijai.
          </p>
          <LocalizedLink
            href="/admin/providers"
            className={styles.actionButton}
          >
            Eiti į planų valdymą
          </LocalizedLink>
        </article>
      </section>
    </main>
  );
}