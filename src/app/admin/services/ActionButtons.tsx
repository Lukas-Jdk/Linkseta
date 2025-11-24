// src/app/admin/services/ActionButtons.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "../provider-requests/provider-requests.module.css";

type ActionProps = {
  id: string;
  isActive: boolean;
  highlighted: boolean;
};

export default function ActionButtons({
  id,
  isActive,
  highlighted,
}: ActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggleActive() {
    await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  async function toggleHighlight() {
    await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlighted: !highlighted }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        onClick={toggleActive}
        disabled={pending}
        className={isActive ? styles.btnSecondary : styles.btnPrimary}
      >
        {isActive ? "Išjungti" : "Įjungti"}
      </button>

      <button
        type="button"
        onClick={toggleHighlight}
        disabled={pending}
        className={highlighted ? styles.btnSecondary : styles.btnHighlight}
      >
        {highlighted ? "Nuimti TOP" : "Pažymėti TOP"}
      </button>
    </div>
  );
}
