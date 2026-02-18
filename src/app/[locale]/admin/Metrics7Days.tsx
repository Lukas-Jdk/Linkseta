//  src/app/[locale]/admin/Metrics7Days.tsx
"use client";

import styles from "./metrics7days.module.css";

type Series = {
  label: string; // pvz. "Vartotojai"
  values: number[]; // 7 reikšmės
};

type Props = {
  days: string[]; // 7 labeliai pvz "02-11"
  series: Series[];
};

function maxOfSeries(series: Series[]) {
  let m = 0;
  for (const s of series) for (const v of s.values) m = Math.max(m, v);
  return m || 1;
}

export default function Metrics7Days({ days, series }: Props) {
  const max = maxOfSeries(series);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Paskutinės 7 dienos</h2>
        <p className={styles.subtitle}>
          Nauji vartotojai / paslaugos / paraiškos per dieną
        </p>
      </div>

      <div className={styles.grid}>
        {series.map((s) => (
          <div key={s.label} className={styles.block}>
            <div className={styles.blockHeader}>
              <div className={styles.blockTitle}>{s.label}</div>
              <div className={styles.blockTotal}>
                {s.values.reduce((a, b) => a + b, 0)}
              </div>
            </div>

            <div className={styles.chart}>
              {s.values.map((v, i) => {
                const h = Math.round((v / max) * 100);
                return (
                  <div key={`${s.label}-${i}`} className={styles.barCol}>
                    <div
                      className={styles.bar}
                      style={{ height: `${h}%` }}
                      aria-label={`${days[i]}: ${v}`}
                      title={`${days[i]}: ${v}`}
                    />
                    <div className={styles.day}>{days[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}