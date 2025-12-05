// src/app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      profile: true, // ProviderProfile
      services: {
        include: {
          city: true,
          category: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const isProvider = !!user.profile?.isApproved;
  const services = user.services;

  const hasServices = services.length > 0;

  return (
    <main className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Mano paskyra</h1>
          <p className={styles.subheading}>
            Čia galite valdyti savo paskyrą ir paslaugų skelbimus.
          </p>
        </div>

        {isProvider && (
          <Link href="/dashboard/services/new" className="btn btn-primary">
            + Nauja paslauga
          </Link>
        )}
      </div>

      {/* 1. Info apie paskyrą */}
      <section className={`card ${styles.card}`}>
        <h2 className={styles.cardTitle}>Paskyros informacija</h2>
        <p className={styles.cardText}>
          El. paštas: <strong>{user.email}</strong>
        </p>
        <p className={styles.cardText}>
          Vardas: <strong>{user.name ?? "—"}</strong>
        </p>
        <p className={styles.cardText}>
          Rolė sistemoje: <strong>{user.role}</strong>
        </p>

        <div className={styles.badgeRow}>
          {isProvider ? (
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              Patvirtintas paslaugų teikėjas
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeMuted}`}>
              Kol kas nepaslaugų teikėjas
            </span>
          )}

          {hasServices && (
            <span className={styles.badge}>
              Skelbimų: <strong>{services.length}</strong>
            </span>
          )}
        </div>
      </section>

      {/* 2. Jei NE teikėjas – kviesti tapti */}
      {!isProvider && (
        <section className={`card ${styles.card}`}>
          <h2 className={styles.cardTitle}>Tapkite paslaugų teikėju</h2>
          <p className={styles.cardText}>
            Norite reklamuoti savo paslaugas Linksetoje? Tapkite paslaugų
            teikėju ir sukurkite savo skelbimą, kad kiti lietuviai Norvegijoje
            lengvai jus rastų.
          </p>
          <div className={styles.cardActions}>
            <Link href="/tapti-teikeju" className="btn btn-primary">
              Tapti paslaugų teikėju
            </Link>
          </div>
        </section>
      )}

      {/* 3. Jei teikėjas, bet neturi paslaugų */}
      {isProvider && !hasServices && (
        <section className={`card ${styles.card}`}>
          <h2 className={styles.cardTitle}>Sukurkite savo pirmą paslaugą</h2>
          <p className={styles.cardText}>
            Jūs jau esate patvirtintas paslaugų teikėjas. Dabar belieka sukurti
            savo pirmą skelbimą – įrašykite paslaugos pavadinimą, aprašymą,
            miestą, kategoriją ir kainą.
          </p>
          <div className={styles.cardActions}>
            <Link href="/dashboard/services/new" className="btn btn-primary">
              + Sukurti skelbimą
            </Link>
          </div>
        </section>
      )}

      {/* 4. Jei teikėjas ir turi paslaugų – rodom sąrašą */}
      {isProvider && hasServices && (
        <section className={styles.servicesSection}>
          <div className={styles.servicesHeader}>
            <h2 className={styles.cardTitle}>Mano paslaugos</h2>
            <p className={styles.cardText}>
              Čia matote visus savo skelbimus. Galite juos redaguoti, išjungti
              ar ištrinti atskirame skiltyje.
            </p>
          </div>

          <div className={styles.servicesList}>
            {services.map((service) => (
              <article key={service.id} className={styles.serviceItem}>
                <div className={styles.serviceMain}>
                  <h3 className={styles.serviceTitle}>{service.title}</h3>
                  <div className={styles.serviceMeta}>
                    {service.city && (
                      <span>{service.city.name}</span>
                    )}
                    {service.category && (
                      <span>{service.category.name}</span>
                    )}
                    <span>
                      Sukurta:{" "}
                      {new Date(service.createdAt).toLocaleDateString("lt-LT")}
                    </span>
                  </div>
                </div>

                <div className={styles.serviceRight}>
                  <div className={styles.serviceBadges}>
                    <span
                      className={`${styles.badge} ${
                        service.isActive
                          ? styles.badgeSuccess
                          : styles.badgeWarning
                      }`}
                    >
                      {service.isActive ? "Aktyvi" : "Išjungta"}
                    </span>
                    {service.highlighted && (
                      <span
                        className={`${styles.badge} ${styles.badgeHighlight}`}
                      >
                        Išskirta
                      </span>
                    )}
                  </div>

                  <div className={styles.serviceActions}>
                    <Link
                      href={`/services/${service.slug}`}
                      className={styles.linkSoft}
                    >
                      Peržiūrėti skelbimą
                    </Link>
                    <Link
                      href={`/dashboard/services/${service.id}/edit`}
                      className={styles.linkSoft}
                    >
                      Redaguoti
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.bottomActions}>
            <Link href="/dashboard/services" className="btn btn-outline">
              Valdyti visas paslaugas
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
