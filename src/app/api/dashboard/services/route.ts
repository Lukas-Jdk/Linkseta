// src/app/api/dashboard/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Body = {
  title?: string;
  description?: string;
  cityId?: string | null;
  categoryId?: string | null;
  priceFrom?: string | number | null;
  imageUrl?: string | null;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ąčęėįšųūž\- ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(baseTitle: string) {
  const base = slugify(baseTitle) || "paslauga";
  let slug = base;
  let counter = 1;

  // kol toks slug jau egzistuoja – pridedam skaičių
  // pvz. "santechnikos-darbai", "santechnikos-darbai-2", ...
  // kad Next/Prisma nepyktų dėl unique
  // (ServiceListing.slug yra @unique)
  while (true) {
    const existing = await prisma.serviceListing.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    counter += 1;
    slug = `${base}-${counter}`;
  }
}

// POST /api/dashboard/services – sukurti naują paslaugą
export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser();
    if (response || !user) {
      return (
        response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // patikrinam, ar user yra patvirtintas teikėjas
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || !profile.isApproved) {
      return NextResponse.json(
        {
          error:
            "Jūs dar nesate patvirtintas paslaugų teikėjas. Pirmiausia pasirinkite planą puslapyje „Tapti teikėju“.",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Body;

    const { title, description, cityId, categoryId, priceFrom, imageUrl } =
      body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Trūksta pavadinimo arba aprašymo." },
        { status: 400 }
      );
    }

    const price =
      priceFrom === null || priceFrom === "" || priceFrom === undefined
        ? null
        : Number(priceFrom);

    const slug = await generateUniqueSlug(title);

    const created = await prisma.serviceListing.create({
      data: {
        userId: user.id,
        title,
        slug,
        description,
        cityId: cityId || null,
        categoryId: categoryId || null,
        priceFrom: Number.isNaN(price as number)
          ? null
          : ((price as number) ?? null),
        imageUrl: imageUrl || null,
        isActive: true,
        highlighted: false,
      },
    });

    return NextResponse.json({ success: true, service: created });
  } catch (err: unknown) {
    console.error("POST /api/dashboard/services error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Nepavyko sukurti paslaugos", details: message },
      { status: 500 }
    );
  }
}
