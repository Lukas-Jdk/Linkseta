// src/app/[locale]/admin/reviews/page.tsx
import { redirect } from "next/navigation";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import ReviewsModerationClient from "./ReviewsModerationClient";
import styles from "./reviews.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export default async function AdminReviewsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const pendingReviews = await prisma.serviceReview.findMany({
    where: {
      isApproved: false,
      isVisible: false,
      isSuspicious: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: {
      id: true,
      rating: true,
      name: true,
      comment: true,
      weight: true,
      suspicionScore: true,
      isSuspicious: true,
      isApproved: true,
      isVisible: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      },
      provider: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          locationCity: true,
          city: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const reviews = pendingReviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    name: review.name,
    comment: review.comment,
    weight: review.weight,
    suspicionScore: review.suspicionScore,
    isSuspicious: review.isSuspicious,
    isApproved: review.isApproved,
    isVisible: review.isVisible,
    createdAt: toIso(review.createdAt),
    user: {
      id: review.user.id,
      email: review.user.email,
      name: review.user.name,
      createdAt: toIso(review.user.createdAt),
    },
    provider: {
      id: review.provider.id,
      email: review.provider.email,
      name: review.provider.name,
    },
    service: {
      id: review.service.id,
      title: review.service.title,
      slug: review.service.slug,
      locationCity: review.service.locationCity ?? review.service.city?.name ?? null,
    },
  }));

  return (
    <main className={styles.wrapper}>
      <section className={styles.heroCard}>
        <div>
          <div className={styles.eyebrow}>ADMIN</div>
          <h1 className={styles.title}>Atsiliepimų moderavimas</h1>
          <p className={styles.subtitle}>
            Čia matysi atsiliepimus, kurie pateko į suspicious / pending būseną.
            Patvirtink tik tuos, kurie atrodo normalūs.
          </p>
        </div>

        <LocalizedLink href="/admin" className={styles.backLink}>
          ← Grįžti į admin
        </LocalizedLink>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Laukiantys review</span>
          <strong>{reviews.length}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Rodomi po patvirtinimo</span>
          <strong>Approve</strong>
        </div>

        <div className={styles.statCard}>
          <span>Atmetami iš sąrašo</span>
          <strong>Reject</strong>
        </div>
      </section>

      <ReviewsModerationClient locale={locale} initialReviews={reviews} />
    </main>
  );
}