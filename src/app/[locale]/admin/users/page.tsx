import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const PAGE_SIZE = 50;

function safeLocale(locale: string) {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

function asString(v: string | string[] | undefined) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function parsePage(v: string | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

async function toggleLifetimeFreeAction(formData: FormData) {
  "use server";

  const locale = safeLocale(String(formData.get("locale") || "lt"));
  const userId = String(formData.get("userId") || "");
  const nextValueRaw = String(formData.get("nextValue") || "false");
  const nextValue = nextValueRaw === "true";

  const { user, response } = await requireAdmin();
  if (response || !user || user.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  if (!userId) {
    redirect(`/${locale}/admin/users`);
  }

  const existingProfile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      isApproved: true,
      lifetimeFree: true,
    },
  });

  if (!existingProfile) {
    redirect(`/${locale}/admin/users`);
  }

  await prisma.providerProfile.update({
    where: { userId },
    data: {
      lifetimeFree: nextValue,
      lifetimeFreeGrantedAt: nextValue ? new Date() : null,
      lifetimeFreeGrantedBy: nextValue ? user.id : null,
    },
  });

  revalidatePath(`/${locale}/admin/users`);
  revalidatePath(`/${locale}/admin`);
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = safeLocale(rawLocale);

  const { response } = await requireAdmin();
  if (response) redirect(`/${locale}`);

  const resolved = await searchParams;
  const page = parsePage(asString(resolved.page));

  const totalUsers = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      profile: {
        select: {
          isApproved: true,
          lifetimeFree: true,
          lifetimeFreeGrantedAt: true,
          plan: {
            select: {
              slug: true,
              name: true,
              isTrial: true,
            },
          },
        },
      },
      _count: { select: { services: true } },
    },
  });

  const safeUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    isProvider: Boolean(u.profile),
    isApprovedProvider: u.profile?.isApproved ?? false,
    lifetimeFree: u.profile?.lifetimeFree ?? false,
    lifetimeFreeGrantedAt: u.profile?.lifetimeFreeGrantedAt
      ? u.profile.lifetimeFreeGrantedAt.toISOString()
      : null,
    servicesCount: u._count.services,
    planSlug: u.profile?.plan?.slug ?? null,
    planName: u.profile?.plan?.name ?? null,
    isTrial: u.profile?.plan?.isTrial ?? false,
  }));

  const providersCount = safeUsers.filter((u) => u.isProvider).length;
  const lifetimeCount = safeUsers.filter((u) => u.lifetimeFree).length;

  const basePath = `/${locale}/admin/users`;
  const buildPageHref = (nextPage: number) =>
    nextPage <= 1 ? basePath : `${basePath}?page=${nextPage}`;

  return (
    <main className={styles.wrapper}>
      <section className={styles.heroCard}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}>USERS</div>
          <h1 className={styles.heading}>Vartotojų sąrašas</h1>
          <p className={styles.subheading}>
            Čia matysi visus registruotus vartotojus, jų rolę, provider statusą,
            planą ir galėsi greitai suteikti arba nuimti lifetime free.
          </p>
        </div>
        <div className={styles.heroGlow} aria-hidden="true" />
      </section>

      <div className={styles.metaRow}>
        <span className={styles.metaChip}>
          Viso vartotojų: <strong>&nbsp;{totalUsers}</strong>
        </span>
        <span className={styles.metaChip}>
          Teikėjai: <strong>&nbsp;{providersCount}</strong>
        </span>
        <span className={styles.metaChip}>
          Lifetime free: <strong>&nbsp;{lifetimeCount}</strong>
        </span>
        <span className={styles.metaChip}>
          Puslapis: <strong>&nbsp;{currentPage}</strong> / {totalPages}
        </span>
      </div>

      {safeUsers.length === 0 ? (
        <p className={styles.empty}>Kol kas nėra nė vieno vartotojo.</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vartotojas</th>
                  <th>Telefonas</th>
                  <th>Rolė</th>
                  <th>Teikėjas</th>
                  <th>Planas</th>
                  <th>Skelbimai</th>
                  <th>Lifetime</th>
                  <th>Veiksmas</th>
                </tr>
              </thead>
              <tbody>
                {safeUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userName}>{u.name ?? "—"}</div>
                        <div className={styles.userEmail}>{u.email}</div>
                        <div className={styles.userMeta}>
                          Sukurta: {new Date(u.createdAt).toLocaleString("lt-LT")}
                        </div>
                      </div>
                    </td>

                    <td>{u.phone ?? "—"}</td>

                    <td>
                      {u.role === "ADMIN" ? (
                        <span className={styles.badgePremium}>ADMIN</span>
                      ) : (
                        <span className={styles.badgeNeutral}>USER</span>
                      )}
                    </td>

                    <td>
                      {u.isProvider ? (
                        u.isApprovedProvider ? (
                          <span className={styles.statusActive}>
                            Aktyvus teikėjas
                          </span>
                        ) : (
                          <span className={styles.statusInactive}>
                            Neaktyvus teikėjas
                          </span>
                        )
                      ) : (
                        <span className={styles.badgeNeutral}>Ne teikėjas</span>
                      )}
                    </td>

                    <td>
                      {u.planSlug ? (
                        u.planSlug === "premium" ? (
                          <span className={styles.badgePremium}>
                            {u.planName ?? "Premium"}
                          </span>
                        ) : u.isTrial ? (
                          <span className={styles.badgeTrial}>
                            {u.planName ?? "Trial"}
                          </span>
                        ) : (
                          <span className={styles.badgeNeutral}>
                            {u.planName ?? u.planSlug}
                          </span>
                        )
                      ) : (
                        <span className={styles.badgeNeutral}>Be plano</span>
                      )}
                    </td>

                    <td>{u.servicesCount}</td>

                    <td>
                      {u.lifetimeFree ? (
                        <div className={styles.userCell}>
                          <span className={styles.badgeLifetime}>
                            ⭐ Lifetime free
                          </span>
                          <div className={styles.userMeta}>
                            {u.lifetimeFreeGrantedAt
                              ? new Date(u.lifetimeFreeGrantedAt).toLocaleString(
                                  "lt-LT",
                                )
                              : "—"}
                          </div>
                        </div>
                      ) : (
                        <span className={styles.badgeNeutral}>Ne</span>
                      )}
                    </td>

                    <td>
                      {u.isProvider ? (
                        <div className={styles.actionCell}>
                          <form action={toggleLifetimeFreeAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="userId" value={u.id} />
                            <input
                              type="hidden"
                              name="nextValue"
                              value={u.lifetimeFree ? "false" : "true"}
                            />

                            <button
                              type="submit"
                              className={
                                u.lifetimeFree
                                  ? styles.dangerButton
                                  : styles.button
                              }
                            >
                              {u.lifetimeFree
                                ? "Nuimti lifetime"
                                : "Duoti lifetime"}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className={styles.badgeNeutral}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationRow}>
              {currentPage > 1 ? (
                <LocalizedLink
                  href={buildPageHref(currentPage - 1)}
                  className={styles.button}
                >
                  ← Ankstesnis
                </LocalizedLink>
              ) : (
                <span />
              )}

              <span className={styles.metaChip}>
                Puslapis <strong>&nbsp;{currentPage}</strong> iš {totalPages}
              </span>

              {currentPage < totalPages ? (
                <LocalizedLink
                  href={buildPageHref(currentPage + 1)}
                  className={styles.button}
                >
                  Kitas →
                </LocalizedLink>
              ) : (
                <span />
              )}
            </div>
          )}

          <LocalizedLink href="/admin" className={styles.backLink}>
            ← Grįžti į admin pradžią
          </LocalizedLink>
        </>
      )}
    </main>
  );
}