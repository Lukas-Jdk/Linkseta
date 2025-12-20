// src/components/service-marquee/ServiceMarquee.tsx
"use client";

import React from "react";
import styles from "./ServiceMarquee.module.css";
import {
  Scissors,
  Wrench,
  Hammer,
  Paintbrush,
  Brush, // <- vietoj Sparkles "Valymas"
  Car,
  Home,
  Laptop,
  Dumbbell,
  HeartPulse,
  GraduationCap,
  Baby,
  PawPrint,
  ChefHat,
  Camera,
  Leaf,
} from "lucide-react";

type Item = {
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const ITEMS: Item[] = [
  { label: "Kirpykla", Icon: Scissors },
  { label: "Meistrai", Icon: Wrench },
  { label: "Remontas", Icon: Hammer },
  { label: "Dažymas", Icon: Paintbrush },
  { label: "Valymas", Icon: Brush },
  { label: "Autoservisas", Icon: Car },
  { label: "Namai", Icon: Home },
  { label: "IT", Icon: Laptop },
  { label: "Sportas", Icon: Dumbbell },
  { label: "Sveikata", Icon: HeartPulse },
  { label: "Mokymai", Icon: GraduationCap },
  { label: "Vaikai", Icon: Baby },
  { label: "Gyvūnai", Icon: PawPrint },
  { label: "Maistas", Icon: ChefHat },
  { label: "Foto", Icon: Camera },
  { label: "Sodas", Icon: Leaf },
];

export default function ServiceMarquee() {
  return (
    <section className={styles.wrap} aria-label="Paslaugų kategorijos">
      <div className={styles.viewport}>
        <div className={styles.track}>
          {/* 1 grupė */}
          <div className={styles.group}>
            {ITEMS.map((item) => (
              <div className={styles.pill} key={item.label}>
                <item.Icon className={styles.icon} aria-hidden="true" />
                <span className={styles.text}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* identiška kopija non-stop efektui */}
          <div className={styles.group} aria-hidden="true">
            {ITEMS.map((item) => (
              <div className={styles.pill} key={`${item.label}-clone`}>
                <item.Icon className={styles.icon} aria-hidden="true" />
                <span className={styles.text}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* subtilus fade kraštuose (kaip reklamos juostose) */}
      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
    </section>
  );
}
