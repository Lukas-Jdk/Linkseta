// middleware.ts (ROOT - ne src/)
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { createServerClient } from "@supabase/ssr";

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

function getLocaleFromPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean);
  const maybe = seg[0];
  if (!maybe) return null;
  return (routing.locales as readonly string[]).includes(maybe) ? maybe : null;
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

  // 1) Pirmiausia – next-intl (jis gali padaryti redirect/rewrites į /lt/...)
  const intlRes = await intlMiddleware(req as any);

  // next-intl visada grąžina Response/NextResponse. Mes jį panaudosim kaip bazę.
  const res = intlRes ?? NextResponse.next();

  // 2) Auth guard tik tada, kai kelias jau turi locale prefix (pvz /lt/..)
  const locale = getLocaleFromPath(pathname);
  if (!locale) {
    setSecurityHeaders(res as any);
    return res as any;
  }

  if (!isProtected(pathname, locale)) {
    setSecurityHeaders(res as any);
    return res as any;
  }

  // 3) Supabase SSR auth patikra per cookies middleware kontekste
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return req.cookies.get(name)?.value;
      },
      set(name, value, options) {
        // svarbu: naudoti tą patį "res", kad cookie update būtų išsaugotas
        (res as any).cookies?.set?.({ name, value, ...options });
      },
      remove(name, options) {
        (res as any).cookies?.set?.({ name, value: "", ...options });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  // 4) Jei neprisijungęs – redirect į /{locale}/login?next=...
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", pathname + (req.nextUrl.search ?? ""));
    const redirectRes = NextResponse.redirect(loginUrl);
    setSecurityHeaders(redirectRes as any);
    return redirectRes;
  }

  // 5) Jei ADMIN route – tikrinam rolę per tavo API (/api/auth/me)
  if (isAdminPath(pathname, locale)) {
    try {
      const roleRes = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });

      const json = await roleRes.json().catch(() => null);
      const role = json?.user?.role;

      if (role !== "ADMIN") {
        const homeUrl = req.nextUrl.clone();
        homeUrl.pathname = `/${locale}`;
        homeUrl.search = "";
        const redirectRes = NextResponse.redirect(homeUrl);
        setSecurityHeaders(redirectRes as any);
        return redirectRes;
      }
    } catch {
      const homeUrl = req.nextUrl.clone();
      homeUrl.pathname = `/${locale}`;
      homeUrl.search = "";
      const redirectRes = NextResponse.redirect(homeUrl);
      setSecurityHeaders(redirectRes as any);
      return redirectRes;
    }
  }

  // 6) viskas ok – praleidžiam
  setSecurityHeaders(res as any);
  return res as any;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)",
  ],
};