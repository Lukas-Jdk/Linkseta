// prisma/seed.cjs

// Pasakom Node, kad naudojam CommonJS
// ir importuojam PrismaClient iš @prisma/client

/* eslint-disable @typescript-eslint/no-require-imports */

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

  // --- Planai (paruošta Stripe/Vipps ateičiai) ---
  const plans = [
    {
      id: "plan_demo",
      name: "Demo planas",
      slug: "demo",
      priceNok: 0,
      period: "MONTHLY",
      maxListings: 1,
      highlight: false,
    },
    {
      id: "plan_basic",
      name: "Basic",
      slug: "basic",
      priceNok: 199,
      period: "MONTHLY",
      maxListings: 3,
      highlight: false,
    },
    {
      id: "plan_premium",
      name: "Premium",
      slug: "premium",
      priceNok: 399,
      period: "MONTHLY",
      maxListings: 10,
      highlight: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
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
