// src/components/service-marquee/ServiceMarquee.tsx
import { useTranslations } from "next-intl";
import styles from "./ServiceMarquee.module.css";
import { categoryIconMap, DefaultCategoryIcon } from "@/lib/categoryIcons";

type Item = {
  label: string;
  slug: string;
};

export default function ServiceMarquee() {
  const t = useTranslations("serviceMarquee");

  const ITEMS: Item[] = [
    { label: t("items.statybos"), slug: "statybos" },
    { label: t("items.remontas"), slug: "remontas" },
    { label: t("items.santechnika"), slug: "santechnika" },
    { label: t("items.elektra"), slug: "elektra" },
    { label: t("items.buitine"), slug: "buitin-technika" },
    { label: t("items.valymas"), slug: "valymas" },
    { label: t("items.auto"), slug: "automobiliai" },
    { label: t("items.transportas"), slug: "transportas" },
    { label: t("items.grozis"), slug: "grois" },
    { label: t("items.it"), slug: "it-paslaugos" },
    { label: t("items.apskaita"), slug: "apskaita" },
    { label: t("items.teisine"), slug: "teisins-paslaugos" },
    { label: t("items.nt"), slug: "nt" },
    { label: t("items.mokymai"), slug: "mokymai" },
    { label: t("items.vaikai"), slug: "vaik-prieira" },
    { label: t("items.gyvunai"), slug: "gyvn-prieira" },
    { label: t("items.maistas"), slug: "maistas" },
    { label: t("items.namai"), slug: "nam-kis" },
    { label: t("items.kita"), slug: "kita" },
  ];

  function MarqueeGroup({ suffix = "" }: { suffix?: string }) {
    return (
      <div className={styles.group} aria-hidden={suffix ? "true" : undefined}>
        {ITEMS.map((item) => {
          const Icon = categoryIconMap[item.slug] ?? DefaultCategoryIcon;

          return (
            <div className={styles.pill} key={`${item.slug}${suffix}`}>
              <Icon className={styles.icon} aria-hidden="true" />
              <span className={styles.text}>{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className={styles.wrap} aria-label={t("aria")}>
      <div className={styles.viewport}>
        <div className={styles.track}>
          <MarqueeGroup />
          <MarqueeGroup suffix="-clone" />
        </div>
      </div>

      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
    </section>
  );
}