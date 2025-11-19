// src/components/features/Features.tsx

import styles from "./Features.module.css";

export default function Features() {
  const items = [
    {
      icon: "📍",
      title: "Vieta lietuvių paslaugų teikėjams Norvegijoje",
      text: "Nauja platforma, kuri jungia lietuvių specialistus ir klientus vienoje vietoje"
    },
    {
      icon: "🕒",
      title: "Ieškai ar teiki? Abu variantai čia tinka",
      text: "Tiek ieškant paslaugos, tiek norint pasiūlyti – ši vieta skirta tau"
    },
    {
      icon: "💼",
      title: "Kuriame bendruomenę nuo nulio",
      text: "Ši platforma auga – būk vienas iš pirmųjų ir gauk daugiau matomumo"
    }
  ];

  return (
    <div className={styles.grid}>
      {items.map((it, i) => (
        <div key={i} className={styles.col}>
          <div className={styles.icon} aria-hidden>{it.icon}</div>
          <h3 className={styles.h3}>{it.title}</h3>
          <p className={styles.p}>{it.text}</p>
        </div>
      ))}
    </div>
  );
}
