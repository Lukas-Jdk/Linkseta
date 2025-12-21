// src/app/services/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./slugPage.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatDateLT(date: Date) {
  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function initialLetter(name: string | null, email: string) {
  const src = (name && name.trim()) ? name.trim() : email;
  return src.slice(0, 1).toUpperCase();
}

export default async function ServiceDetailsPage({ params }: Props) {
  const { slug } = await params;

  const service = await prisma.serviceListing.findUnique({
    where: { slug },
    include: {
      city: true,
      category: true,
      user: true,
    },
  });

  if (!service || !service.isActive) {
    notFound();
  }

  const cover = service.imageUrl || "/def.webp";
  const city = service.city?.name ?? "—";
  const category = service.category?.name ?? "—";

  const sellerName = service.user.name?.trim() || service.user.email.split("@")[0];
  const sellerInitial = initialLetter(service.user.name, service.user.email);

  const created = formatDateLT(service.createdAt);

  const priceLabel = service.priceFrom != null ? "Kaina nuo" : "Kaina";
  const priceValue =
    service.priceFrom != null ? `${formatPriceNOK(service.priceFrom)} NOK` : "Kaina sutartinė";

  const mailto = `mailto:${service.user.email}?subject=${encodeURIComponent(
    `Užklausa dėl paslaugos: ${service.title}`
  )}`;

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.topBar}>
          <Link href="/services" className={styles.backLink}>
            ← Grįžti į sąrašą
          </Link>
        </div>

        <div className={styles.layout}>
          {/* LEFT */}
          <section className={styles.left}>
            <div className={styles.coverCard}>
              <div className={styles.coverWrap}>
                <Image
                  src={cover}
                  alt={service.title}
                  fill
                  className={styles.coverImg}
                  sizes="(max-width: 980px) 100vw, 760px"
                  priority={service.highlighted}
                />
                {service.highlighted && (
                  <span className={styles.topBadge}>TOP skelbimas</span>
                )}
              </div>
            </div>

            <div className={styles.detailsCard}>
              <header className={styles.detailsHeader}>
                <h1 className={styles.title}>{service.title}</h1>

                <div className={styles.metaRow}>
                  <span className={styles.metaChip}>📍 {city}</span>
                  <span className={styles.metaChip}>📁 {category}</span>
                  <span className={styles.metaChip}>📅 {created}</span>
                </div>
              </header>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Aprašymas</h2>
                <p className={styles.desc}>{service.description}</p>
              </div>

              <div id="kontaktai" className={styles.section}>
               
            

             
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className={styles.right}>
            <div className={styles.sideCard}>
              <div className={styles.sideLabel}>{priceLabel}</div>
              <div className={styles.sidePrice}>{priceValue}</div>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sellerRow}>
                <div className={styles.sellerAvatar} aria-hidden="true">
                  {sellerInitial}
                </div>
                <div className={styles.sellerInfo}>
                  <div className={styles.sellerLabel}>Skelbėjas</div>
                  <div className={styles.sellerName}>{sellerName}</div>
                </div>
              </div>

              <a className={styles.emailBtn} href={mailto}>
                ✉ Rašyti el. paštu
              </a>

          
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
