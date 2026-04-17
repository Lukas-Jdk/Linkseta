// src/components/cards/CardGrid.tsx
import { useTranslations } from "next-intl";
import PremiumServiceCard from "./PremiumServiceCard";
import ServiceCard from "./ServiceCard";
import styles from "./CardGrid.module.css";

export type CardGridItem = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  category: string;
  priceFrom: number | null;
  priceTo: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl: string | null;
  locationPostcode?: string;
  locationCity?: string;
  locationRegion?: string;
};

type Props = {
  items: CardGridItem[];
  variant?: "premium" | "compact";
  locale: string;
};

export default function CardGrid({
  items,
  variant = "premium",
  locale,
}: Props) {
  const t = useTranslations("cardGrid");

  if (!items.length) {
    return <div className={styles.empty}>{t("empty")}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.heading}>
          {variant === "premium" ? t("popularTitle") : t("resultsTitle")}
        </h2>
      </header>

      <div className={styles.grid}>
        {items.map((item) =>
          variant === "premium" ? (
            <PremiumServiceCard
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description ?? ""}
              city={item.city}
              category={item.category}
              priceFrom={item.priceFrom}
              priceTo={item.priceTo}
              slug={item.slug}
              highlighted={item.highlighted}
              imageUrl={item.imageUrl || ""}
              locale={locale}
              locationPostcode={item.locationPostcode}
              locationCity={item.locationCity}
              locationRegion={item.locationRegion}
            />
          ) : (
            <ServiceCard
              key={item.id}
              title={item.title}
              description={item.description ?? ""}
              city={item.city}
              category={item.category}
              priceFrom={item.priceFrom}
              priceTo={item.priceTo}
              slug={item.slug}
              highlighted={item.highlighted}
              imageUrl={item.imageUrl || ""}
              locale={locale}
              locationPostcode={item.locationPostcode}
              locationCity={item.locationCity}
              locationRegion={item.locationRegion}
            />
          ),
        )}
      </div>
    </div>
  );
}