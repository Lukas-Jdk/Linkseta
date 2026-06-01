// src/app/[locale]/dashboard/ProfileCardClient.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./dashboard.module.css";

type WorkingHours = {
  weekdays?: string;
  saturday?: string;
  sunday?: string;
} | null;

type Props = {
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  totalServices: number;
  isProviderApproved: boolean;

  about: string | null;
  experienceYears: number | null;
  completedProjects: number | null;
  workingHours: unknown;
};

function getInitialLetter(name: string | null, email: string) {
  const source = name && name.trim() ? name.trim() : email;
  return source.slice(0, 1).toUpperCase();
}

function parseWorkingHours(value: unknown): WorkingHours {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;

  return {
    weekdays: typeof data.weekdays === "string" ? data.weekdays : "",
    saturday: typeof data.saturday === "string" ? data.saturday : "",
    sunday: typeof data.sunday === "string" ? data.sunday : "",
  };
}

function getLocalText(locale: string) {
  if (locale === "en") {
    return {
      providerInfo: "Provider profile",
      about: "About me",
      aboutEn: "About me EN",
      aboutNo: "About me NO",
      experienceYears: "Years of experience",
      completedProjects: "Completed projects",
      workingHours: "Working hours",
      weekdays: "Monday - Friday",
      saturday: "Saturday",
      sunday: "Sunday",
      aboutPlaceholder: "Tell customers about your experience, work style and services.",
      timePlaceholder: "E.g. 09:00 - 17:00 or By agreement",
    };
  }

  if (locale === "no") {
    return {
      providerInfo: "Tilbyderprofil",
      about: "Om meg",
      aboutEn: "Om meg EN",
      aboutNo: "Om meg NO",
      experienceYears: "Års erfaring",
      completedProjects: "Fullførte prosjekter",
      workingHours: "Arbeidstid",
      weekdays: "Mandag - Fredag",
      saturday: "Lørdag",
      sunday: "Søndag",
      aboutPlaceholder: "Fortell kundene om erfaring, arbeidsstil og tjenester.",
      timePlaceholder: "F.eks. 09:00 - 17:00 eller Etter avtale",
    };
  }

  return {
    providerInfo: "Teikėjo profilis",
    about: "Apie mane",
    aboutEn: "Apie mane EN",
    aboutNo: "Apie mane NO",
    experienceYears: "Metų patirtis",
    completedProjects: "Įgyvendintų projektų",
    workingHours: "Darbo laikas",
    weekdays: "Pirmadienis - Penktadienis",
    saturday: "Šeštadienis",
    sunday: "Sekmadienis",
    aboutPlaceholder: "Aprašykite savo patirtį, darbo stilių ir paslaugas.",
    timePlaceholder: "Pvz. 09:00 - 17:00 arba Pagal susitarimą",
  };
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
  about,
  experienceYears,
  completedProjects,
  workingHours,
}: Props) {
  const t = useTranslations("profileCard");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";
  const localText = getLocalText(locale);

  const parsedWorkingHours = parseWorkingHours(workingHours);

  const [localName, setLocalName] = useState(name?.trim() || "");
  const [localPhone, setLocalPhone] = useState(phone?.trim() || "");
  const [localCompanyName, setLocalCompanyName] = useState(
    companyName?.trim() || "",
  );

  const [localAbout, setLocalAbout] = useState(about?.trim() || "");

  const [localExperienceYears, setLocalExperienceYears] = useState(
    typeof experienceYears === "number" ? String(experienceYears) : "",
  );
  const [localCompletedProjects, setLocalCompletedProjects] = useState(
    typeof completedProjects === "number" ? String(completedProjects) : "",
  );
  const [localWorkingHours, setLocalWorkingHours] = useState<WorkingHours>(
    parsedWorkingHours,
  );

  const [draftName, setDraftName] = useState(localName);
  const [draftPhone, setDraftPhone] = useState(localPhone);
  const [draftCompanyName, setDraftCompanyName] = useState(localCompanyName);
  const [draftAbout, setDraftAbout] = useState(localAbout);
  const [draftExperienceYears, setDraftExperienceYears] = useState(
    localExperienceYears,
  );
  const [draftCompletedProjects, setDraftCompletedProjects] = useState(
    localCompletedProjects,
  );
  const [draftWorkingHours, setDraftWorkingHours] = useState<WorkingHours>(
    localWorkingHours,
  );

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
    setDraftAbout(localAbout);
    setDraftExperienceYears(localExperienceYears);
    setDraftCompletedProjects(localCompletedProjects);
    setDraftWorkingHours(localWorkingHours);
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
          about: draftAbout.trim(),
          experienceYears: draftExperienceYears.trim(),
          completedProjects: draftCompletedProjects.trim(),
          workingHours: {
            weekdays: draftWorkingHours?.weekdays?.trim() ?? "",
            saturday: draftWorkingHours?.saturday?.trim() ?? "",
            sunday: draftWorkingHours?.sunday?.trim() ?? "",
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t("saveFailed"));
      }

      setLocalName(data?.profile?.name ?? draftName.trim());
      setLocalPhone(data?.profile?.phone ?? draftPhone.trim());
      setLocalCompanyName(data?.profile?.companyName ?? draftCompanyName.trim());
      setLocalAbout(data?.profile?.about ?? draftAbout.trim());
      setLocalExperienceYears(
        data?.profile?.experienceYears != null
          ? String(data.profile.experienceYears)
          : draftExperienceYears.trim(),
      );
      setLocalCompletedProjects(
        data?.profile?.completedProjects != null
          ? String(data.profile.completedProjects)
          : draftCompletedProjects.trim(),
      );
      setLocalWorkingHours(data?.profile?.workingHours ?? draftWorkingHours);

      setModalOpen(false);
      router.refresh();
    
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
              <LocalizedLink href="/plans" className={styles.ctaBtn}>
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

              {isProviderApproved && (
                <>
                  <div className={styles.modalDivider} />

                  <h3 className={styles.modalSectionTitle}>
                    {localText.providerInfo}
                  </h3>

                  <label className={styles.modalField}>
                    <span className={styles.label}>{localText.about}</span>
                    <textarea
                      className={styles.textarea}
                      value={draftAbout}
                      onChange={(e) => setDraftAbout(e.target.value)}
                      placeholder={localText.aboutPlaceholder}
                      rows={5}
                      maxLength={2000}
                      disabled={saving}
                    />
                  </label>

                  <div className={styles.modalTwoCols}>
                    <label className={styles.modalField}>
                      <span className={styles.label}>
                        {localText.experienceYears}
                      </span>
                      <input
                        className={styles.input}
                        value={draftExperienceYears}
                        onChange={(e) =>
                          setDraftExperienceYears(e.target.value)
                        }
                        inputMode="numeric"
                        maxLength={3}
                        disabled={saving}
                      />
                    </label>

                    <label className={styles.modalField}>
                      <span className={styles.label}>
                        {localText.completedProjects}
                      </span>
                      <input
                        className={styles.input}
                        value={draftCompletedProjects}
                        onChange={(e) =>
                          setDraftCompletedProjects(e.target.value)
                        }
                        inputMode="numeric"
                        maxLength={6}
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <h3 className={styles.modalSectionTitle}>
                    {localText.workingHours}
                  </h3>

                  <label className={styles.modalField}>
                    <span className={styles.label}>{localText.weekdays}</span>
                    <input
                      className={styles.input}
                      value={draftWorkingHours?.weekdays ?? ""}
                      onChange={(e) =>
                        setDraftWorkingHours((prev) => ({
                          ...(prev ?? {}),
                          weekdays: e.target.value,
                        }))
                      }
                      placeholder={localText.timePlaceholder}
                      maxLength={80}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.modalField}>
                    <span className={styles.label}>{localText.saturday}</span>
                    <input
                      className={styles.input}
                      value={draftWorkingHours?.saturday ?? ""}
                      onChange={(e) =>
                        setDraftWorkingHours((prev) => ({
                          ...(prev ?? {}),
                          saturday: e.target.value,
                        }))
                      }
                      placeholder={localText.timePlaceholder}
                      maxLength={80}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.modalField}>
                    <span className={styles.label}>{localText.sunday}</span>
                    <input
                      className={styles.input}
                      value={draftWorkingHours?.sunday ?? ""}
                      onChange={(e) =>
                        setDraftWorkingHours((prev) => ({
                          ...(prev ?? {}),
                          sunday: e.target.value,
                        }))
                      }
                      placeholder={localText.timePlaceholder}
                      maxLength={80}
                      disabled={saving}
                    />
                  </label>
                </>
              )}

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