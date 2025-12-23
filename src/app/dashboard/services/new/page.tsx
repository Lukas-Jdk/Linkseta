// src/app/dashboard/services/new/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { CategoryType } from "@prisma/client";
import NewServiceForm from "./NewServiceForm";
import styles from "./NewServiceForm.module.css";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { profile: true },
  });

  if (!user) {
    redirect("/login");
  }

  const isProvider = !!user.profile?.isApproved;

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: CategoryType.SERVICE },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!isProvider) {
    return (
      <main className={styles.wrapper}>
        <div className={styles.shell}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Sukurti paslaugą</h1>
            <p className={styles.pageSubtitle}>
              Norėdami sukurti paslaugos skelbimą, pirmiausia turite tapti
              patvirtintu paslaugų teikėju.
            </p>
          </header>

          <div className={styles.sectionCard}>
            <p className={styles.infoText}>
              Pasirinkite planą puslapyje <strong>„Tapti paslaugų teikėju“</strong>,
              tada grįžkite čia ir galėsite sukurti skelbimą.
            </p>

            <a href="/tapti-teikeju" className="btn btn-primary">
              Tapti paslaugų teikėju
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Nauja paslauga</h1>
          <p className={styles.pageSubtitle}>
            Užpildykite formą ir sukurkite savo paslaugos skelbimą. Vėliau
            galėsite jį redaguoti per savo paskyrą.
          </p>
        </header>

        <NewServiceForm
          cities={cities.map((c) => ({ id: c.id, name: c.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
