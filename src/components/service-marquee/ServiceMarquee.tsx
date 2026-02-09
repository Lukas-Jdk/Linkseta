// src/components/service-marquee/ServiceMarquee.tsx
"use client";

import React from "react";
import styles from "./ServiceMarquee.module.css";
import { categoryIconMap, DefaultCategoryIcon } from "@/lib/categoryIcons";

type Item = {
  label: string;
  slug: string;
};

const ITEMS: Item[] = [
  { label: "Statybos", slug: "statybos" },
  { label: "Remontas", slug: "remontas" },
  { label: "Santechnika", slug: "santechnika" },
  { label: "Elektra", slug: "elektra" },
  { label: "Buitinė technika", slug: "buitin-technika" },
  { label: "Valymas", slug: "valymas" },
  { label: "Automobiliai", slug: "automobiliai" },
  { label: "Transportas", slug: "transportas" },
  { label: "Grožis", slug: "grois" },
  { label: "IT", slug: "it-paslaugos" },
  { label: "Apskaita", slug: "apskaita" },
  { label: "Teisinės", slug: "teisins-paslaugos" },
  { label: "NT", slug: "nt" },
  { label: "Mokymai", slug: "mokymai" },
  { label: "Vaikai", slug: "vaik-prieira" },
  { label: "Gyvūnai", slug: "gyvn-prieira" },
  { label: "Maistas", slug: "maistas-kateris" },
  { label: "Namų ūkis", slug: "nam-kis" },
  { label: "Kita", slug: "kita" },
];

export default function ServiceMarquee() {
  return (
    <section className={styles.wrap} aria-label="Paslaugų kategorijos">
      <div className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.group}>
            {ITEMS.map((item) => {
              const Icon = categoryIconMap[item.slug] ?? DefaultCategoryIcon;
              return (
                <div className={styles.pill} key={item.slug}>
                  <Icon className={styles.icon} aria-hidden="true" />
                  <span className={styles.text}>{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.group} aria-hidden="true">
            {ITEMS.map((item) => {
              const Icon = categoryIconMap[item.slug] ?? DefaultCategoryIcon;
              return (
                <div className={styles.pill} key={`${item.slug}-clone`}>
                  <Icon className={styles.icon} aria-hidden="true" />
                  <span className={styles.text}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
    </section>
  );
}
