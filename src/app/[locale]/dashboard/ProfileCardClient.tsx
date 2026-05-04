// src/app/[locale]/dashboard/ProfileCardClient.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./dashboard.module.css";

type Props = {
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
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
  phone,
  companyName,
  role,
  avatarUrl,
  totalServices,
  isProviderApproved,
}: Props) {
  const t = useTranslations("profileCard");

  const [localName, setLocalName] = useState(name?.trim() || "");
  const [localPhone, setLocalPhone] = useState(phone?.trim() || "");
  const [localCompanyName, setLocalCompanyName] = useState(
    companyName?.trim() || "",
  );

  const [draftName, setDraftName] = useState(localName);
  const [draftPhone, setDraftPhone] = useState(localPhone);
  const [draftCompanyName, setDraftCompanyName] = useState(localCompanyName);

  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(
    avatarUrl ?? null,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = localName || email.split("@")[0];
  const initial = getInitialLetter(displayName, email);
  const accountTypeLabel = isProviderApproved ? t("provider") : t("user");

  function openModal() {
    setDraftName(localName);
    setDraftPhone(localPhone);
    setDraftCompanyName(localCompanyName);
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setError(null);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (draftName.trim().length < 2) {
      setError(t("nameTooShort"));
      return;
    }

    setSaving(true);

    try {
      const res = await csrfFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          phone: draftPhone.trim(),
          companyName: draftCompanyName.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("saveFailed"));
      }

      setLocalName(data?.profile?.name ?? draftName.trim());
      setLocalPhone(data?.profile?.phone ?? draftPhone.trim());
      setLocalCompanyName(data?.profile?.companyName ?? draftCompanyName.trim());

      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
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

            {localPhone && (
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>☎</span>
                <span className={styles.infoText}>{localPhone}</span>
              </div>
            )}

            {localCompanyName && (
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>🏢</span>
                <span className={styles.infoText}>{localCompanyName}</span>
              </div>
            )}

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
              <span className={styles.providerPending}>
                {t("inactiveProvider")}
              </span>
            )}
          </div>

          <div className={styles.profileCta}>
            <button type="button" className={styles.ctaBtn} onClick={openModal}>
              {t("editProfile")}
            </button>
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

      {modalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <form className={styles.modalCard} onSubmit={saveProfile}>
            <div className={styles.modalHeader}>
              <div>
                <h2 id="profile-edit-title" className={styles.modalTitle}>
                  {t("profileEditTitle")}
                </h2>
                <p className={styles.modalSubtitle}>
                  {t("profileEditSubtitle")}
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                disabled={saving}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>

            <div className={styles.modalForm}>
              <label className={styles.modalField}>
                <span className={styles.label}>{t("name")}</span>
                <input
                  className={styles.input}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  maxLength={80}
                  disabled={saving}
                />
              </label>

              <label className={styles.modalField}>
                <span className={styles.label}>{t("phone")}</span>
                <input
                  className={styles.input}
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  maxLength={30}
                  disabled={saving}
                />
              </label>

              <label className={styles.modalField}>
                <span className={styles.label}>{t("company")}</span>
                <input
                  className={styles.input}
                  value={draftCompanyName}
                  onChange={(e) => setDraftCompanyName(e.target.value)}
                  placeholder={t("companyPlaceholder")}
                  maxLength={120}
                  disabled={saving}
                />
              </label>

              {error && <div className={styles.errorText}>{error}</div>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeModal}
                disabled={saving}
              >
                {t("cancel")}
              </button>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}