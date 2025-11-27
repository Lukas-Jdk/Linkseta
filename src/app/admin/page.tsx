// src/app/admin/page.tsx
import Link from "next/link";
import AdminGuard from "@/components/auth/AdminGuard";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <AdminGuard>
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Admin valdymo skydas</h1>

        <section className={styles.card}>
          <h2 className={styles.subtitle}>Paslaugų moderavimas</h2>
          <p className={styles.text}>
            Čia gali peržiūrėti visas paslaugas, jas įjungti / išjungti,
            pažymėti kaip TOP ir ištrinti netinkamas.
          </p>
          <Link href="/admin/services" className={styles.button}>
            Eiti į paslaugų sąrašą
          </Link>
        </section>

        <section className={styles.card} style={{ marginTop: "24px" }}>
          <h2 className={styles.subtitle}>Teikėjų paraiškos</h2>
          <p className={styles.text}>
            Čia matosi visi „Tapk paslaugų teikėju“ užpildyti prašymai. Gali
            juos patvirtinti arba atmesti.
          </p>
          <Link
            href="/admin/provider-requests"
            className={styles.button}
          >
            Eiti į paraiškas
          </Link>
        </section>
      </main>
    </AdminGuard>
  );
}
