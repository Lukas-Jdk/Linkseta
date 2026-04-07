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
    { name: "Oslo", slug: "oslo", postcode: "0001" },
    { name: "Lillestrøm", slug: "lillestrom", postcode: "2000" },
    { name: "Strømmen", slug: "strommen", postcode: "2010" },
    { name: "Lysaker", slug: "lysaker", postcode: "1366" },
    { name: "Skøyen", slug: "skoyen", postcode: "0277" },
    { name: "Billingstad", slug: "billingstad", postcode: "1396" },
    { name: "Sandvika", slug: "sandvika", postcode: "1300" },
    { name: "Asker", slug: "asker", postcode: "1383" },
    { name: "Bærum", slug: "baerum", postcode: "1300" },
    { name: "Fornebu", slug: "fornebu", postcode: "1360" },
    { name: "Drammen", slug: "drammen", postcode: "3001" },
    { name: "Bergen", slug: "bergen", postcode: "5003" },
    { name: "Trondheim", slug: "trondheim", postcode: "7011" },
    { name: "Stavanger", slug: "stavanger", postcode: "4001" },
    { name: "Sandnes", slug: "sandnes", postcode: "4301" },
    { name: "Kristiansand", slug: "kristiansand", postcode: "4608" },
    { name: "Tromsø", slug: "tromso", postcode: "9008" },
    { name: "Ålesund", slug: "alesund", postcode: "6001" },
    { name: "Bodø", slug: "bodo", postcode: "8001" },
    { name: "Haugesund", slug: "haugesund", postcode: "5501" },
    { name: "Fredrikstad", slug: "fredrikstad", postcode: "1601" },
    { name: "Sarpsborg", slug: "sarpsborg", postcode: "1701" },
    { name: "Tønsberg", slug: "tonsberg", postcode: "3101" },
    { name: "Moss", slug: "moss", postcode: "1501" },
    { name: "Skien", slug: "skien", postcode: "3701" },
    { name: "Arendal", slug: "arendal", postcode: "4801" },
    { name: "Hamar", slug: "hamar", postcode: "2301" },
    { name: "Lillehammer", slug: "lillehammer", postcode: "2601" },
  ];

  for (const city of cities) {
    const slug = city.slug || slugify(city.name);

    await prisma.city.upsert({
      where: { slug },
      update: {
        name: city.name,
        postcode: city.postcode,
      },
      create: {
        name: city.name,
        slug,
        postcode: city.postcode,
      },
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
    "Sportas",
    "Mityba",
    "Maistas",
    "Konditerija",
    "Renginiai",
    "Apskaita",
    "Teisinės paslaugos",
    "IT paslaugos",
    "Fotografija",
    "Mokymai",
    "Vaikų priežiūra",
    "Gyvūnų priežiūra",
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
      priceNok: 149,
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
      priceNok: 299,
      period: "MONTHLY",
      maxListings: 10,
      maxImagesPerListing: 15,
      highlight: true,
      isTrial: false,
      trialDays: null,
    },
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