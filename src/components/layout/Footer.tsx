/* src/components/layout/Footer.tsx */

import styles from "./Footer.module.css";

export default function Footer () {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <p className={styles.copy}>
           © 2025 Linkseta All rights reserved. | <a href="/terms">Terms of Use</a> | <a href="/privacy">Privacy Policy</a>
        </p>
      </div>
    </footer>
  )
}