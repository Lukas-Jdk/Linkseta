// src/app/api/profile/avatar/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function extFromType(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Neprisijungęs." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nerastas failas (file)." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Leidžiami tik paveikslėliai." },
        { status: 400 }
      );
    }

    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json(
        { error: "Maks. failo dydis 5MB." },
        { status: 400 }
      );
    }

    const ext = extFromType(file.type);
    const path = `${authUser.id}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Nepavyko įkelti į storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // ✅ SVARBU: jei DB neturi avatarUrl stulpelio – čia kris.
    // Todėl duodu ir fallback: jei update nepavyksta – grąžinam URL, bet nebreakinam upload’o.
    try {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { avatarUrl: publicUrl },
      });
    } catch (dbErr) {
      console.error("DB update avatarUrl failed:", dbErr);
      return NextResponse.json(
        {
          error:
            "Nuotrauka įkelta į storage, bet DB neturi avatarUrl stulpelio. Reikia migracijos.",
          publicUrl,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, publicUrl }, { status: 200 });
  } catch (err: unknown) {
    console.error("Profilio avatar klaida:", err);

    const message = err instanceof Error ? err.message : "Serverio klaida.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
