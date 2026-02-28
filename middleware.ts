// middleware.ts (ROOT - ne src/)
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { createServerClient } from "@supabase/ssr";

function genNonce() {
  // Edge runtime friendly
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64
  return btoa(String.fromCharCode(...bytes));
}

function getLocaleFromPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean);
  const maybe = seg[0];
  if (!maybe) return null;
  return (routing.locales as readonly string[]).includes(maybe) ? maybe : null;
}

function setSecurityHeaders(res: NextResponse, nonce: string) {
  // ✅ CSP su nonce (scriptams be unsafe-inline)
  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https:`,
    // 👇 styles: jei nori 100% be unsafe-inline, turi nebeturėti style={{}} kode.
    // Jei paliksi style={{}} (pvz EditServiceForm turi), tada reikės leisti style-src-attr.
    `style-src 'self' https:`,
    `script-src 'self' 'nonce-${nonce}' https://www.google.com https://www.gstatic.com https://www.recaptcha.net`,
    `connect-src 'self' https: wss:`,
    `frame-src 'self' https://www.google.com https://www.recaptcha.net`,
    `upgrade-insecure-requests`,
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);

  // Kiti headeriai
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
}

function isProtected(pathname: string, locale: string) {
  return (
    pathname === `/${locale}/dashboard` ||
    pathname.startsWith(`/${locale}/dashboard/`) ||
    pathname === `/${locale}/admin` ||
    pathname.startsWith(`/${locale}/admin/`)
  );
}

function isAdminPath(pathname: string, locale: string) {
  return pathname === `/${locale}/admin` || pathname.startsWith(`/${locale}/admin/`);
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 0) nonce + perduodam jį į request headers (kad server components galėtų perskaityti)
  const nonce = genNonce();
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);

  // 1) Locale: jei nėra /lt /en /no — redirect į /lt (ar tavo default)
  const locale = getLocaleFromPath(pathname);

  if (!locale) {
    // ignoruojam root assetus etc (pagal matcher bus atfiltruota)
    const url = req.nextUrl.clone();
    url.pathname = `/lt${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url, { headers: reqHeaders });
    setSecurityHeaders(res, nonce);
    return res;
  }

  // 2) bazinis res su request override headers
  const res = NextResponse.next({
    request: { headers: reqHeaders },
  });

  // 3) Auth guard tik protected keliams
  if (isProtected(pathname, locale)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${locale}/login`;
      loginUrl.searchParams.set("next", pathname + (req.nextUrl.search ?? ""));
      const redirectRes = NextResponse.redirect(loginUrl, { headers: reqHeaders });
      setSecurityHeaders(redirectRes, nonce);
      return redirectRes;
    }

    if (isAdminPath(pathname, locale)) {
      try {
        const roleRes = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
          headers: { cookie: req.headers.get("cookie") ?? "" },
          cache: "no-store",
        });
        const json = await roleRes.json().catch(() => null);
        const role = json?.user?.role;

        if (role !== "ADMIN") {
          const homeUrl = req.nextUrl.clone();
          homeUrl.pathname = `/${locale}`;
          homeUrl.search = "";
          const redirectRes = NextResponse.redirect(homeUrl, { headers: reqHeaders });
          setSecurityHeaders(redirectRes, nonce);
          return redirectRes;
        }
      } catch {
        const homeUrl = req.nextUrl.clone();
        homeUrl.pathname = `/${locale}`;
        homeUrl.search = "";
        const redirectRes = NextResponse.redirect(homeUrl, { headers: reqHeaders });
        setSecurityHeaders(redirectRes, nonce);
        return redirectRes;
      }
    }
  }

  setSecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)",
  ],
};