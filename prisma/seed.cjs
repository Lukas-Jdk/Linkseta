// prisma/seed.cjs

// Pasakom Node, kad naudojam CommonJS
// ir importuojam PrismaClient iš @prisma/client
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding duomenis...");

  // --- Miestai ---
  const cities = [
    { id: "city_oslo", name: "Oslo", slug: "oslo" },
    { id: "city_bergen", name: "Bergenas", slug: "bergen" },
    { id: "city_stavanger", name: "Stavangeris", slug: "stavanger" },
    { id: "city_trondheim", name: "Trondheim", slug: "trondheim" },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { id: city.id },
      update: {},
      create: city,
    });
  }

  // --- Kategorijos ---
  const categories = [
    { id: "cat_statybos", name: "Statybos", slug: "statybos" },
    { id: "cat_auto", name: "Automobiliai", slug: "automobiliai" },
    { id: "cat_apskaita", name: "Apskaita", slug: "apskaita" },
    { id: "cat_nt", name: "NT", slug: "nt" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }

  console.log("Seed pabaigta ✅");
}

main()
  .catch((e) => {
    console.error("Seed klaida:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
