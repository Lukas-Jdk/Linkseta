// src/app/api/contact/route.ts

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyRecaptcha(token: string | null) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: "Trūksta reCAPTCHA token." };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | {
        success?: boolean;
        score?: number;
        action?: string;
      }
    | null;

  if (!json?.success) {
    return { ok: false, error: "reCAPTCHA patikra nepavyko." };
  }

  if (typeof json.score === "number" && json.score < 0.4) {
    return { ok: false, error: "Žinutė atmesta kaip įtartina." };
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const name = cleanText(body?.name, 80);
    const email = cleanText(body?.email, 160).toLowerCase();
    const message = cleanText(body?.message, 3000);
    const recaptchaToken =
      typeof body?.recaptchaToken === "string" ? body.recaptchaToken : null;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Užpildykite visus laukus." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Neteisingas el. pašto formatas." },
        { status: 400 },
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: "Žinutė per trumpa." },
        { status: 400 },
      );
    }

    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) {
      return NextResponse.json(
        { error: captcha.error || "reCAPTCHA klaida." },
        { status: 400 },
      );
    }

    const host = process.env.EMAIL_SMTP_HOST;
    const port = Number(process.env.EMAIL_SMTP_PORT || 587);
    const user = process.env.EMAIL_SMTP_USER;
    const pass = process.env.EMAIL_SMTP_PASS;
    const to = process.env.EMAIL_TO;
    const from = process.env.EMAIL_FROM || user;

    if (!host || !port || !user || !pass || !to || !from) {
      return NextResponse.json(
        { error: "Nesukonfigūruotas el. pašto siuntimas." },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"Linkseta kontaktų forma" <${from}>`,
      to,
      replyTo: email,
      subject: `Nauja žinutė iš Linkseta kontakto formos – ${name}`,
      text: [
        `Vardas: ${name}`,
        `El. paštas: ${email}`,
        "",
        "Žinutė:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">
          <h2 style="margin:0 0 16px">Nauja žinutė iš Linkseta kontakto formos</h2>
          <p><strong>Vardas:</strong> ${escapeHtml(name)}</p>
          <p><strong>El. paštas:</strong> ${escapeHtml(email)}</p>
          <p><strong>Žinutė:</strong></p>
          <div style="white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#f9fafb">
            ${escapeHtml(message)}
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/contact error", error);
    return NextResponse.json(
      { error: "Serverio klaida. Pabandykite vėliau." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}