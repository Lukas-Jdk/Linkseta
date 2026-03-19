// src/app/[locale]/dashboard/ProfileCardClient.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("profileCard");
  const displayName = name?.trim() || email.split("@")[0];
  const initial = getInitialLetter(name, email);

  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(
    avatarUrl ?? null,
  );

  const accountTypeLabel = isProviderApproved
    ? t("provider")
    : t("user");

  return (
    <aside className={styles.profileCard}>
      <div className={styles.profileHeaderBg} />

      <div className={styles.profileBody}>
        <div className={styles.avatarWrap}>
          <AvatarUploader
            avatarUrl={localAvatarUrl}
            initial={initial}
            onUploaded={(url) => setLocalAvatarUrl(url)}
          />
        </div>

        <div className={styles.profileIdentity}>
          <div className={styles.profileName}>{displayName}</div>
          <div className={styles.profileType}>{accountTypeLabel}</div>
        </div>

        <div className={styles.profileInfoList}>
          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>✉</span>
            <span className={styles.infoText}>{email}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>🛡</span>
            <span className={styles.infoText}>
              {role === "ADMIN" ? t("admin") : t("user")}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoIcon}>📦</span>
            <span className={styles.infoText}>
              {totalServices} {t("listings")}
            </span>
          </div>
        </div>

        <div className={styles.profileBadges}>
          {isProviderApproved ? (
            <span className={styles.providerOk}>{t("activeProvider")}</span>
          ) : (
            <span className={styles.providerPending}>{t("inactiveProvider")}</span>
          )}
        </div>

        {!isProviderApproved && (
          <div className={styles.profileCta}>
            <LocalizedLink href="/tapti-teikeju" className={styles.ctaBtn}>
              {t("becomeProvider")}
            </LocalizedLink>
          </div>
        )}
      </div>
    </aside>
  );
}