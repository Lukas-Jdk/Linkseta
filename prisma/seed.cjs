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
    "Maistas",
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
    {
      name: "Free Trial",
      slug: "free-trial",
      priceNok: 0,
      period: "MONTHLY",
      maxListings: 1,
      maxImagesPerListing: 3,
      highlight: false,
      isTrial: true,
      trialDays: 30,
    },
    {
      name: "Basic",
      slug: "basic",
      priceNok: 199,
      period: "MONTHLY",
      maxListings: 3,
      maxImagesPerListing: 5,
      highlight: false,
      isTrial: false,
      trialDays: null,
    },
    {
      name: "Premium",
      slug: "premium",
      priceNok: 399,
      period: "MONTHLY",
      maxListings: 10,
      maxImagesPerListing: 15,
      highlight: true,
      isTrial: false,
      trialDays: null,
    },

    // Paslėptas planas tavo pirmiems testuotojams
    {
      name: "Beta (tester)",
      slug: "beta",
      priceNok: 0,
      period: "MONTHLY",
      maxListings: 10,
      maxImagesPerListing: 15,
      highlight: true,
      isTrial: false,
      trialDays: null,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceNok: plan.priceNok,
        period: plan.period,
        maxListings: plan.maxListings,
        maxImagesPerListing: plan.maxImagesPerListing,
        highlight: plan.highlight,
        isTrial: plan.isTrial,
        trialDays: plan.trialDays,
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