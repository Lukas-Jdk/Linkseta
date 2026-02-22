// src/app/api/profile/avatar/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const BUCKET = "avatars";

function extFromType(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    await rateLimitOrThrow({
      key: `profile:avatar:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Neprisijungęs." }, { status: 401 });

    if (!authUser.supabaseId) {
      return NextResponse.json(
        { error: "Trūksta supabaseId (vartotojo susiejimas nepavyko)." },
        { status: 500 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Nerastas failas (file)." }, { status: 400 });
    }

    const ext = extFromType(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Leidžiami: JPG, PNG, WEBP." }, { status: 400 });
    }

    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json({ error: "Maks. failo dydis 5MB." }, { status: 400 });
    }

    // folderis pagal supabase uid
    const path = `${authUser.supabaseId}/${Date.now()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false, // production: geriau neoverwrite’int (kad netyčia nenumušt)
    });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Nepavyko įkelti į storage: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ ok: true, publicUrl }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Profilio avatar klaida:", err);
    const message = err instanceof Error ? err.message : "Serverio klaida.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}