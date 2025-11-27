// src/app/api/dashboard/create-service/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function makeSlug(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ąčęėįšųūž ]/g, "")
    .replace(/\s+/g, "-");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user || !data.user.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const email = data.user.email;

    const body = await req.json();
    const {
      title,
      description,
      priceFrom,
      priceTo,
      cityId,
      categoryId,
    } = body as {
      title?: string;
      description?: string;
      priceFrom?: number | null;
      priceTo?: number | null;
      cityId?: string | null;
      categoryId?: string | null;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    const slug = makeSlug(title);

    const service = await prisma.serviceListing.create({
      data: {
        userId: user.id,
        title,
        slug,
        description,
        priceFrom: priceFrom ?? null,
        priceTo: priceTo ?? null,
        isActive: true,
        highlighted: false,
        cityId: cityId || null,
        categoryId: categoryId || null,
      },
      include: {
        city: true,
        category: true,
      },
    });

    return NextResponse.json(
      { ok: true, service },
      { status: 201 }
    );
  } catch (err) {
    console.error("create-service error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
