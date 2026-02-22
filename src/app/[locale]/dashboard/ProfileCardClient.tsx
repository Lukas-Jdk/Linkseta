// src/app/[locale]/dashboard/ProfileCardClient.tsx
"use client";

import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "./dashboard.module.css";
import AvatarUploader from "@/components/profile/AvatarUploader";

type Props = {
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  totalServices: number;
  isProviderApproved: boolean;
};

function getInitialLetter(name: string | null, email: string) {
  const source = name && name.trim() ? name.trim() : email;
  return source.slice(0, 1).toUpperCase();
}

export default function ProfileCardClient({
  name,
  email,
  role,
  avatarUrl,
  totalServices,
  isProviderApproved,
}: Props) {
  const displayName = name?.trim() || email.split("@")[0];
  const initial = getInitialLetter(name, email);

  return (
    <aside className={styles.profileCard}>
      <div className={styles.profileHeaderBg} />

      <div className={styles.profileBody}>
        <div className={styles.avatarWrap}>
          <AvatarUploader
            avatarUrl={avatarUrl}
            initial={initial}
            onUploaded={() => window.location.reload()}
          />
        </div>

        <div className={styles.profileIdentity}>
          <div className={styles.profileName}>{displayName}</div>
          <div className={styles.profileType}>Paslaugų teikėjas</div>
        </div>

        <div className={styles.profileInfoList}>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>✉</span>
            <span className={styles.infoText}>{email}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>🛡</span>
            <span className={styles.infoText}>
              {role === "ADMIN" ? "Administratorius" : "Vartotojas"}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>📦</span>
            <span className={styles.infoText}>{totalServices} skelbimai</span>
          </div>
        </div>

        <div className={styles.profileBadges}>
          {isProviderApproved ? (
            <span className={styles.providerOk}>Patvirtintas teikėjas</span>
          ) : (
            <span className={styles.providerPending}>
              Nepatvirtintas teikėjas
            </span>
          )}
        </div>

        {!isProviderApproved && (
          <div className={styles.profileCta}>
            <LocalizedLink href="/tapti-teikeju" className={styles.ctaBtn}>
              Tapti paslaugų teikėju
            </LocalizedLink>
          </div>
        )}
      </div>
    </aside>
  );
}
