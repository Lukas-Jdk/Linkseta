//  src/app/[locale]/dashboard/services/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardServicesPage({ params }: Props) {
  const [{ locale }, authUser] = await Promise.all([params, getAuthUser()]);

  if (!authUser) {
    redirect(`/${locale}/login`);
  }

  const services = await prisma.serviceListing.findMany({
    where: {
      userId: authUser.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      priceFrom: true,
      isActive: true,
      city: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>Mano paslaugos</h1>

          <Link
            href={`/${locale}/dashboard/services/new`}
            className={styles.newButton}
          >
            + Nauja paslauga
          </Link>
        </div>

        {services.length === 0 ? (
          <p className={styles.empty}>
            Dar neturite nė vienos paslaugos. Sukurkite pirmą skelbimą paspaudę
            <strong> „Nauja paslauga“</strong>.
          </p>
        ) : (
          <ul className={styles.list}>
            {services.map((s) => (
              <li key={s.id} className={styles.listItem}>
                <div>
                  <div className={styles.serviceTitle}>{s.title}</div>
                  <div className={styles.meta}>
                    {s.city?.name && <span>{s.city.name}</span>}
                    {s.category?.name && <span> · {s.category.name}</span>}
                    {typeof s.priceFrom === "number" && (
                      <span> · nuo {s.priceFrom} NOK</span>
                    )}
                    <span> · {s.isActive ? "Aktyvi" : "Išjungta"}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Link
                    href={`/${locale}/services/${s.slug}`}
                    className={styles.linkButton}
                  >
                    Peržiūrėti
                  </Link>

                  <Link
                    href={`/${locale}/dashboard/services/${s.id}/edit`}
                    className={styles.linkButton}
                  >
                    Redaguoti
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}