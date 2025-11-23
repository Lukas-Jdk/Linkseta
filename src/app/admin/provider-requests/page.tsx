import styles from "./providerRequests.module.css";
import { prisma } from "@/lib/prisma";
import ProviderRequestsAdminTable from "./ProviderRequestsAdminTable";

export default async function ProviderRequestsAdminPage() {
  const requests = await prisma.providerRequest.findMany({
    include: {
      city: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Paverčiam į paprastus duomenis, kad būtų saugu paduoti į client komponentą
  const safeRequests = requests.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    cityName: r.city?.name ?? null,
    categoryName: r.category?.name ?? null,
    message: r.message,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  }));

  return (
    <main className={styles.wrapper}>
      <div className="container">
        <h1 className={styles.title}>Paslaugų teikėjų paraiškos</h1>
        <p className={styles.subtitle}>
          Čia matosi visi užpildyti „Tapk paslaugų teikėju“ prašymai.
        </p>

        <ProviderRequestsAdminTable initialRequests={safeRequests} />
      </div>
    </main>
  );
}
