// src/components/features/Features.tsx
import { useTranslations } from "next-intl";
import styles from "./Features.module.css";

type FeatureItem = {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
};

const PinIcon: FeatureItem["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ClockIcon: FeatureItem["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 7v5l3 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BriefcaseIcon: FeatureItem["Icon"] = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M9 7V6a2 2 0 012-2h2a2 2 0 012 2v1"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M4 9a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M4 13h16" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function Features() {
  const t = useTranslations("features");

  const items: FeatureItem[] = [
    {
      Icon: PinIcon,
      title: t("items.0.title"),
      text: t("items.0.text"),
    },
    {
      Icon: ClockIcon,
      title: t("items.1.title"),
      text: t("items.1.text"),
    },
    {
      Icon: BriefcaseIcon,
      title: t("items.2.title"),
      text: t("items.2.text"),
    },
  ];

  return (
    <section className={styles.section} aria-label={t("aria")}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>

        <div className={styles.grid}>
          {items.map((it, i) => (
            <article key={i} className={styles.card}>
              <div className={styles.iconWrap} aria-hidden="true">
                <it.Icon className={styles.icon} />
              </div>
              <h3 className={styles.h3}>{it.title}</h3>
              <p className={styles.p}>{it.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}