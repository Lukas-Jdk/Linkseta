// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import LocalizedLink from "@/components/i18n/LocalizedLink";
import {
  HelpCircle,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Clock3,
} from "lucide-react";
import styles from "./contact.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "contactPage" });

  return (
    <main className={styles.wrapper}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>{t("eyebrow")}</div>
            <h1 className={styles.title}>{t("title")}</h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>

          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.bigBubble}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.smallBubble}>
              <Sparkles size={28} />
            </div>
          </div>
        </section>

        <section className={styles.supportCard}>
          <div className={styles.topIcon}>
            <MessageCircle size={30} />
          </div>

          <div className={styles.supportHeader}>
            <h2>{t("supportTitle")}</h2>
            <p>{t("supportSubtitle")}</p>
          </div>

          <div className={styles.contactOptions}>
            <div className={styles.option}>
              <div className={`${styles.optionIcon} ${styles.iconBlue}`}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h3>{t("chatTitle")}</h3>
                <p>{t("chatText")}</p>
                <span>{t("chatHint")}</span>
              </div>
            </div>

            <div className={styles.option}>
              <div className={`${styles.optionIcon} ${styles.iconGreen}`}>
                <Mail size={24} />
              </div>
              <div>
                <h3>{t("emailTitle")}</h3>
                <p>{t("emailText")}</p>
                <a href="mailto:info@linkseta.com">info@linkseta.com</a>
              </div>
            </div>

            <div className={styles.option}>
              <div className={`${styles.optionIcon} ${styles.iconPurple}`}>
                <Clock3 size={24} />
              </div>
              <div>
                <h3>{t("responseTitle")}</h3>
                <p>{t("responseText")}</p>
                <span>{t("responseHint")}</span>
              </div>
            </div>
          </div>

          <LocalizedLink href="/dashboard/messages" className={styles.chatButton}>
            <MessageCircle size={18} />
            {t("chatButton")}
          </LocalizedLink>
        </section>

        <section className={styles.faqSection}>
          <div className={styles.faqTop}>
            <h2>{t("faqTitle")}</h2>
          </div>

          <div className={styles.faqGrid}>
            <details className={styles.faqItem}>
              <summary>
                <ShieldCheck size={20} />
                <span>{t("faq.security.q")}</span>
              </summary>
              <p>{t("faq.security.a")}</p>
            </details>

            <details className={styles.faqItem}>
              <summary>
                <UserRound size={20} />
                <span>{t("faq.provider.q")}</span>
              </summary>
              <p>{t("faq.provider.a")}</p>
            </details>

            <details className={styles.faqItem}>
              <summary>
                <Star size={20} />
                <span>{t("faq.reviews.q")}</span>
              </summary>
              <p>{t("faq.reviews.a")}</p>
            </details>

            <details className={styles.faqItem}>
              <summary>
                <HelpCircle size={20} />
                <span>{t("faq.idea.q")}</span>
              </summary>
              <p>{t("faq.idea.a")}</p>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}