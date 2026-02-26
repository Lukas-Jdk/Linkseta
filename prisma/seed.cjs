// src/prisma/seed.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function upsertCities() {
  const cities = [
    { name: "Oslo", slug: "oslo" },
    { name: "Lillestrøm", slug: "lillestrom" },
    { name: "Strømmen", slug: "strommen" },
    { name: "Lysaker", slug: "lysaker" },
    { name: "Skøyen", slug: "skoyen" },
    { name: "Billingstad", slug: "billingstad" },
    { name: "Sandvika", slug: "sandvika" },
    { name: "Asker", slug: "asker" },
    { name: "Bærum", slug: "baerum" },
    { name: "Fornebu", slug: "fornebu" },
    { name: "Drammen", slug: "drammen" },
    { name: "Bergen", slug: "bergen" },
    { name: "Trondheim", slug: "trondheim" },
    { name: "Stavanger", slug: "stavanger" },
    { name: "Sandnes", slug: "sandnes" },
    { name: "Kristiansand", slug: "kristiansand" },
    { name: "Tromsø", slug: "tromso" },
    { name: "Ålesund", slug: "alesund" },
    { name: "Bodø", slug: "bodo" },
    { name: "Haugesund", slug: "haugesund" },
    { name: "Fredrikstad", slug: "fredrikstad" },
    { name: "Sarpsborg", slug: "sarpsborg" },
    { name: "Tønsberg", slug: "tonsberg" },
    { name: "Moss", slug: "moss" },
    { name: "Skien", slug: "skien" },
    { name: "Arendal", slug: "arendal" },
    { name: "Hamar", slug: "hamar" },
    { name: "Lillehammer", slug: "lillehammer" },
  ];

  for (const city of cities) {
    const slug = city.slug || slugify(city.name);
    await prisma.city.upsert({
      where: { slug },
      update: { name: city.name },
      create: { name: city.name, slug },
    });
  }
}

async function upsertCategories() {
  const names = [
    "Statybos",
    "Remontas",
    "Santechnika",
    "Elektra",
    "Buitinė technika",
    "Automobiliai",
    "Transportas",
    "Valymas",
    "Grožis",
    "Sveikata",
    "Apskaita",
    "Teisinės paslaugos",
    "IT paslaugos",
    "Fotografija",
    "Mokymai",
    "Vaikų priežiūra",
    "Gyvūnų priežiūra",
    "Maistas / Kateris",
    "Namų ūkis",
    "Kita",
  ];

  for (const name of names) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name, type: "SERVICE" },
      create: { name, slug, type: "SERVICE" },
    });
  }
}

async function upsertPlans() {
  const plans = [
    { name: "Demo planas", slug: "demo", priceNok: 0, period: "MONTHLY", maxListings: 1, highlight: false },

    // ✅ planas “pirmiem testuotojam” (prieinamas tik per betaAccess)
    { name: "Beta (tester)", slug: "beta", priceNok: 0, period: "MONTHLY", maxListings: 10, highlight: false },

    // ateičiai (mokėjimai)
    { name: "Basic", slug: "basic", priceNok: 199, period: "MONTHLY", maxListings: 3, highlight: false },
    { name: "Premium", slug: "premium", priceNok: 399, period: "MONTHLY", maxListings: 10, highlight: true },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceNok: plan.priceNok,
        period: plan.period,
        maxListings: plan.maxListings,
        highlight: plan.highlight,
      },
      create: plan,
    });
  }
}

async function main() {
  console.log("Seeding duomenis...");
  await upsertCities();
  await upsertCategories();
  await upsertPlans();
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