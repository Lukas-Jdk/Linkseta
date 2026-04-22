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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

async function resetServiceCategories() {
  const names = [
    "Apskaita",
    "Automobiliai",
    "Buitinė technika",
    "Elektra",
    "Fotografija",
    "Grožis",
    "Gyvūnų priežiūra",
    "IT paslaugos",
    "Kita",
    "Konditerija",
    "Maistas",
    "Mityba",
    "Mokymai",
    "Namų ūkis",
    "Remontas",
    "Renginiai",
    "Santechnika",
    "Sportas",
    "Statybos",
    "Sveikata",
    "Teisinės paslaugos",
    "Transportas",
    "Vaikų priežiūra",
    "Valymas",
  ];

  const wantedSlugs = names.map((name) => slugify(name));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findMany({
      where: { type: "SERVICE" },
      select: { id: true, slug: true },
    });

    const toDelete = existing.filter((c) => !wantedSlugs.includes(c.slug));
    const toDeleteIds = toDelete.map((c) => c.id);

    if (toDeleteIds.length > 0) {
      await tx.serviceListing.updateMany({
        where: { categoryId: { in: toDeleteIds } },
        data: { categoryId: null },
      });

      await tx.providerRequest.updateMany({
        where: { categoryId: { in: toDeleteIds } },
        data: { categoryId: null },
      });

      await tx.category.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
    }

    for (const name of names) {
      const slug = slugify(name);

      await tx.category.upsert({
        where: { slug },
        update: {
          name,
          type: "SERVICE",
        },
        create: {
          name,
          slug,
          type: "SERVICE",
        },
      });
    }
  });
}

async function removeBetaPlan() {
  const betaPlan = await prisma.plan.findUnique({
    where: { slug: "beta" },
    select: { id: true },
  });

  if (!betaPlan) return;

  await prisma.$transaction(async (tx) => {
    const freeTrial = await tx.plan.findUnique({
      where: { slug: "free-trial" },
      select: { id: true },
    });

    if (!freeTrial) {
      throw new Error("free-trial plan not found while removing beta");
    }

    await tx.providerProfile.updateMany({
      where: { planId: betaPlan.id },
      data: { planId: freeTrial.id },
    });

    await tx.serviceListing.updateMany({
      where: { planId: betaPlan.id },
      data: { planId: freeTrial.id },
    });

    await tx.plan.delete({
      where: { id: betaPlan.id },
    });
  });
}

async function upsertPlans() {
  const plans = [
    {
      name: "Free Trial",
      slug: "free-trial",
      priceNok: 0,
      period: "MONTHLY",
      maxListings: 1,
      maxImagesPerListing: 5,
      highlight: false,
      canAppearOnHomepage: false,
      canBecomeTop: false,
      isTrial: true,
      trialDays: 30,
    },
    {
      name: "Basic",
      slug: "basic",
      priceNok: 149,
      period: "MONTHLY",
      maxListings: 3,
      maxImagesPerListing: 15,
      highlight: false,
      canAppearOnHomepage: false,
      canBecomeTop: false,
      isTrial: false,
      trialDays: null,
    },
    {
      name: "Premium",
      slug: "premium",
      priceNok: 299,
      period: "MONTHLY",
      maxListings: 5,
      maxImagesPerListing: 30,
      highlight: true,
      canAppearOnHomepage: true,
      canBecomeTop: true,
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
        canAppearOnHomepage: plan.canAppearOnHomepage,
        canBecomeTop: plan.canBecomeTop,
        isTrial: plan.isTrial,
        trialDays: plan.trialDays,
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        priceNok: plan.priceNok,
        period: plan.period,
        maxListings: plan.maxListings,
        maxImagesPerListing: plan.maxImagesPerListing,
        highlight: plan.highlight,
        canAppearOnHomepage: plan.canAppearOnHomepage,
        canBecomeTop: plan.canBecomeTop,
        isTrial: plan.isTrial,
        trialDays: plan.trialDays,
      },
    });
  }
}

async function main() {
  console.log("Seeding duomenis...");
  await upsertCities();
  await resetServiceCategories();
  await upsertPlans();
  await removeBetaPlan();
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