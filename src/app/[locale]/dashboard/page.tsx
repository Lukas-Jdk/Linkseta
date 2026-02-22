// src/app/[locale]/dashboard/page.tsx
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import styles from "./dashboard.module.css";
import ProfileCardClient from "./ProfileCardClient";
import { MapPin, Folder, Calendar, Eye, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateLT(date: Date) {
  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const authUser = await getAuthUser();
  if (!authUser) redirect(`/${locale}/login`);

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      profile: { select: { isApproved: true } },
      services: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          isActive: true,
          highlighted: true,
          imageUrl: true,
          city: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");

  const isProviderApproved = Boolean(user.profile?.isApproved);
  const services = user.services ?? [];

  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;

  return (
    <main className={styles.page}>
      <div className="container">
        <section className={styles.topCard}>
          <div className={styles.topCardLeft}>
            <h1 className={styles.h1}>Mano paskyra</h1>
            <p className={styles.subtitle}>
              Valdykite savo profilį ir paslaugų skelbimus vienoje vietoje.
            </p>
          </div>

          <div className={styles.topCardRight}>
            {isProviderApproved && (
              <Link
                href={`/${locale}/dashboard/services/new`}
                className={styles.newBtn}
              >
                <span className={styles.plus}>＋</span>
                Nauja paslauga
              </Link>
            )}
          </div>
        </section>

        <div className={styles.grid}>
          <ProfileCardClient
            name={user.name ?? null}
            email={user.email}
            role={user.role}
            avatarUrl={user.avatarUrl ?? null}
            totalServices={totalServices}
            isProviderApproved={isProviderApproved}
          />

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
                    <Link
                      href={`/${locale}/dashboard/services/new`}
                      className={styles.newBtnSmall}
                    >
                      ＋ Sukurti skelbimą
                    </Link>
                  </div>
                </div>
              )}

              {!isProviderApproved && (
                <div className={styles.empty}>
                  Norint kurti paslaugas, reikia tapti patvirtintu paslaugų
                  teikėju.
                  <div className={styles.emptyActions}>
                    <Link
                      href={`/${locale}/tapti-teikeju`}
                      className={styles.newBtnSmall}
                    >
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
                        {s.highlighted && (
                          <span className={styles.topBadge}>TOP</span>
                        )}
                      </div>

                      <div className={styles.serviceMain}>
                        <div className={styles.serviceTopRow}>
                          <div className={styles.serviceTitle}>{s.title}</div>
                          <span
                            className={
                              s.isActive
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {s.isActive ? "Aktyvi" : "Išjungta"}
                          </span>
                        </div>

                        <div className={styles.serviceMeta}>
                          <span className={styles.metaItem}>
                            <MapPin className={styles.metaIcon} />
                            {cityName}
                          </span>

                          <span className={styles.metaItem}>
                            <Folder className={styles.metaIcon} />
                            {catName}
                          </span>

                          <span className={styles.metaItem}>
                            <Calendar className={styles.metaIcon} />
                            {date}
                          </span>
                        </div>

                        <div className={styles.serviceActions}>
                          <Link
                            href={`/${locale}/services/${s.slug}`}
                            className={styles.actionLink}
                            aria-label="Peržiūrėti paslaugą"
                          >
                            <Eye className={styles.actionIcon} />
                            <span>Peržiūrėti</span>
                          </Link>

                          <Link
                            href={`/${locale}/dashboard/services/${s.id}/edit`}
                            className={styles.actionLink}
                            aria-label="Redaguoti paslaugą"
                          >
                            <Pencil className={styles.actionIcon} />
                            <span>Redaguoti</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {isProviderApproved && services.length > 0 && (
              <div className={styles.bottomAction}>
                <Link
                  href={`/${locale}/dashboard/services`}
                  className={styles.manageAllBtn}
                >
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
