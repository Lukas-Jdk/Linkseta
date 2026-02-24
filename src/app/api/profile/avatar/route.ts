// src/app/api/profile/avatar/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { requireCsrf } from "@/lib/csrf";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BUCKET = "avatars";
const MAX_SIZE = 5 * 1024 * 1024;

function extFromType(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

function pathFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length) || null;
}

async function removeOldAvatarIfOwned(userSupabaseId: string, oldPath: string | null) {
  if (!oldPath) return;
  const safePrefix = `${userSupabaseId}/`;
  if (!oldPath.startsWith(safePrefix)) return;

  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
    if (error) console.warn("Avatar remove error:", error.message);
  } catch (e) {
    console.warn("Avatar remove exception:", e);
  }
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `profile:avatar:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Neprisijungęs." }, { status: 401 });
    }

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

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Maks. failo dydis 5MB." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { avatarUrl: true },
    });
    const oldPath = pathFromPublicUrl(existing?.avatarUrl ?? null);

    const path = `${authUser.supabaseId}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Nepavyko įkelti nuotraukos." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: "Nepavyko gauti nuotraukos URL." }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl: publicUrl },
    });

    await removeOldAvatarIfOwned(authUser.supabaseId, oldPath);

    await auditLog({
      action: "AVATAR_UPLOAD",
      entity: "User",
      entityId: authUser.id,
      userId: authUser.id,
      ip,
      userAgent: ua,
      metadata: {
        newPath: path,
        removedOld: Boolean(oldPath),
      },
    });

    return NextResponse.json({ ok: true, publicUrl }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    logError("POST /api/profile/avatar failed", {
      requestId,
      route: "/api/profile/avatar",
      ip,
      meta: { message: err instanceof Error ? err.message : String(err) },
    });

    return NextResponse.json({ error: "Serverio klaida." }, { status: 500 });
  }
}