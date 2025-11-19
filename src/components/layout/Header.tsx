/* src/components/layout/Header.tsx */
import Link from "next/link";
import styles from "./Header.module.css";
import Image from "next/image";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.row}`}>
        <div className={styles.brand}>
          <Link
            href="/"
            aria-label="Linkseta – grįžti į pradžią"
            className={styles.logoLink}
          >
            <Image
              src="/logo.webp"
              alt="Linkseta – paslaugos lietuviams Norvegijoje"
              width={80}
              height={60}
              priority
            />

            <span className={styles.logoText}>Linkseta</span>
          </Link>
        </div>
        <nav className={styles.nav} aria-label="Pagrindinė navigacija">
          <Link href="/">Pagrindinis</Link>
          <Link href="/services">Paslaugos</Link>
          <Link href="/susisiekite">Susisiekite</Link>
        </nav>
      </div>
      <div className={styles.bottomLine} aria-hidden />
    </header>
  );
}
