// src/app/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Teikėjų paraiškos (ProviderRequest)
  const pending = await prisma.providerRequest.count({
    where: { status: "PENDING" },
  });

  const approved = await prisma.providerRequest.count({
    where: { status: "APPROVED" },
  });

  // Paslaugos (ServiceListing) – nauja dalis
  const totalServices = await prisma.serviceListing.count();
  const activeServices = await prisma.serviceListing.count({
    where: { isActive: true },
  });

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.title}>Admin panelė</h1>

      {/* 1️⃣ Kortelė – paslaugų teikėjų paraiškos */}
      <section className={styles.card}>
        <h2 className={styles.subtitle}>Paslaugų teikėjai</h2>
        <p className={styles.text}>
          Laukia patvirtinimo: <strong>{pending}</strong>
          <br />
          Iš viso patvirtintų: <strong>{approved}</strong>
        </p>

        <Link href="/admin/provider-requests" className={styles.button}>
          Valdyti teikėjų paraiškas
        </Link>
      </section>

      {/* 2️⃣ Kortelė – paslaugų skelbimai */}
      <section className={styles.card}>
        <h2 className={styles.subtitle}>Paslaugų skelbimai</h2>
        <p className={styles.text}>
          Aktyvių paslaugų: <strong>{activeServices}</strong>
          <br />
          Iš viso sukurta: <strong>{totalServices}</strong>
        </p>

        {/* Šita nuoroda ves į būsimą admin paslaugų puslapį */}
        <Link href="/admin/services" className={styles.button}>
          Valdyti paslaugas
        </Link>
      </section>
    </main>
  );
}
