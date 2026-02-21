// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function setSecurityHeaders(res: { headers: Headers }) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
}

export default async function middleware(req: NextRequest) {
  // Await intl middleware so redirects/rewrites are respected.
  const maybeResponse = await intlMiddleware(req as any);


  if (maybeResponse && typeof (maybeResponse as any).headers !== "undefined") {
    setSecurityHeaders(maybeResponse as any);
    return maybeResponse as Response;
  }

  // Otherwise proceed with the normal NextResponse.
  const res = NextResponse.next();
  setSecurityHeaders(res as any);
  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)",
  ],
};
