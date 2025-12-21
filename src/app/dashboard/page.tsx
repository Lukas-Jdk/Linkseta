// src/app/dashboard/page.tsx
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function getInitialLetter(name: string | null, email: string) {
  const source = (name && name.trim()) ? name.trim() : email;
  return source.slice(0, 1).toUpperCase();
}

function formatDateLT(date: Date) {
  return new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default async function DashboardPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      profile: true,
      services: {
        include: { city: true, category: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");

  const isProviderApproved = Boolean(user.profile?.isApproved);
  const services = user.services ?? [];

  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const initial = getInitialLetter(user.name ?? null, user.email);

  return (
    <main className={styles.page}>
      <div className="container">
        {/* TOP HEADER CARD */}
        <section className={styles.topCard}>
          <div className={styles.topCardLeft}>
            <h1 className={styles.h1}>Mano paskyra</h1>
            <p className={styles.subtitle}>
              Valdykite savo profilį ir paslaugų skelbimus vienoje vietoje.
            </p>
          </div>

          <div className={styles.topCardRight}>
            {isProviderApproved && (
              <Link href="/dashboard/services/new" className={styles.newBtn}>
                <span className={styles.plus}>＋</span>
                Nauja paslauga
              </Link>
            )}
          </div>
        </section>

        {/* MAIN GRID */}
        <div className={styles.grid}>
          {/* LEFT: PROFILE CARD */}
          <aside className={styles.profileCard}>
            <div className={styles.profileHeaderBg} />

            <div className={styles.profileBody}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatarCircle} aria-hidden="true">
                  {initial}
                </div>
              </div>

              <div className={styles.profileIdentity}>
                <div className={styles.profileName}>{displayName}</div>
                <div className={styles.profileType}>Paslaugų teikėjas</div>
              </div>

              <div className={styles.profileInfoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon}>✉</span>
                  <span className={styles.infoText}>{user.email}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoIcon}>🛡</span>
                  <span className={styles.infoText}>
                    {user.role === "ADMIN" ? "Administratorius" : "Vartotojas"}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoIcon}>📦</span>
                  <span className={styles.infoText}>
                    {totalServices} skelbimai
                  </span>
                </div>
              </div>

              <div className={styles.profileBadges}>
                {isProviderApproved ? (
                  <span className={styles.providerOk}>Patvirtintas teikėjas</span>
                ) : (
                  <span className={styles.providerPending}>Nepatvirtintas teikėjas</span>
                )}
              </div>

              {!isProviderApproved && (
                <div className={styles.profileCta}>
                  <Link href="/tapti-teikeju" className={styles.ctaBtn}>
                    Tapti paslaugų teikėju
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT: SERVICES */}
          <section className={styles.servicesCard}>
            <div className={styles.servicesHeader}>
              <div>
                <h2 className={styles.h2}>Mano paslaugos</h2>
              </div>

              <div className={styles.servicesCount}>
                {activeServices} aktyvūs
              </div>
            </div>

            <div className={styles.servicesList}>
              {isProviderApproved && services.length === 0 && (
                <div className={styles.empty}>
                  Dar neturite paslaugų skelbimų. Sukurkite pirmą skelbimą.
                  <div className={styles.emptyActions}>
                    <Link href="/dashboard/services/new" className={styles.newBtnSmall}>
                      ＋ Sukurti skelbimą
                    </Link>
                  </div>
                </div>
              )}

              {!isProviderApproved && (
                <div className={styles.empty}>
                  Norint kurti paslaugas, reikia tapti patvirtintu paslaugų teikėju.
                  <div className={styles.emptyActions}>
                    <Link href="/tapti-teikeju" className={styles.newBtnSmall}>
                      Tapti teikėju
                    </Link>
                  </div>
                </div>
              )}

              {isProviderApproved &&
                services.map((s) => {
                  const img = s.imageUrl || "/default.png";
                  const cityName = s.city?.name ?? "—";
                  const catName = s.category?.name ?? "—";
                  const date = formatDateLT(s.createdAt);

                  return (
                    <article key={s.id} className={styles.serviceItem}>
                      <div className={styles.serviceThumb}>
                        <Image
                          src={img}
                          alt={s.title}
                          fill
                          className={styles.thumbImg}
                          sizes="120px"
                        />
                        {s.highlighted && <span className={styles.topBadge}>TOP</span>}
                      </div>

                      <div className={styles.serviceMain}>
                        <div className={styles.serviceTopRow}>
                          <div className={styles.serviceTitle}>{s.title}</div>
                          <span
                            className={
                              s.isActive ? styles.statusActive : styles.statusInactive
                            }
                          >
                            {s.isActive ? "Aktyvi" : "Išjungta"}
                          </span>
                        </div>

                        <div className={styles.serviceMeta}>
                          <span className={styles.metaItem}>📍 {cityName}</span>
                          <span className={styles.metaItem}>📁 {catName}</span>
                          <span className={styles.metaItem}>📅 {date}</span>
                        </div>

                        <div className={styles.serviceActions}>
                          <Link href={`/services/${s.slug}`} className={styles.actionLink}>
                            👁 Peržiūrėti
                          </Link>
                          <Link
                            href={`/dashboard/services/${s.id}/edit`}
                            className={styles.actionLink}
                          >
                            ✏️ Redaguoti
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {isProviderApproved && services.length > 0 && (
              <div className={styles.bottomAction}>
                <Link href="/dashboard/services" className={styles.manageAllBtn}>
                  Valdyti visas paslaugas
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
