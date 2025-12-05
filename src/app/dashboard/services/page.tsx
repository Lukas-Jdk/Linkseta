// src/app/dashboard/services/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardServicesPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const services = await prisma.serviceListing.findMany({
    where: { userId: authUser.id },
    include: {
      city: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>Mano paslaugos</h1>

          <Link href="/dashboard/services/new" className={styles.newButton}>
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
                  </div>
                </div>

                <div className={styles.actions}>
                  <Link
                    href={`/services/${s.slug}`}
                    className={styles.linkButton}
                  >
                    Peržiūrėti
                  </Link>
                  <Link
                    href={`/dashboard/services/${s.id}/edit`}
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
