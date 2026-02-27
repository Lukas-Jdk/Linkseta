// src/lib/csrfClient.ts
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf";

let cachedToken: string | null = null;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function fetchCsrfToken(): Promise<string> {
  // 1) try from cookie first
  const cookieToken = readCookie(CSRF_COOKIE);
  if (cookieToken) {
    cachedToken = cookieToken;
    return cookieToken;
  }

  // 2) fetch from API (this must exist)
  const res = await fetch("/api/csrf", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CSRF token fetch failed (${res.status})`);
  }

  const json = (await res.json()) as { token?: string };
  if (!json?.token) throw new Error("CSRF token missing in response");

  cachedToken = json.token;
  return json.token;
}

/**
 *  Helper: return Headers with CSRF token added.
 * This is useful for upload flows (Supabase storage, multipart, etc.)
 */
export async function withCsrfHeaders(
  initHeaders?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(initHeaders ?? {});
  const token = cachedToken ?? (await fetchCsrfToken());
  headers.set(CSRF_HEADER, token);
  return headers;
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const safe = method === "GET" || method === "HEAD" || method === "OPTIONS";

  const headers = new Headers(init.headers ?? {});
  const finalInit: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  if (!safe) {
    const token = cachedToken ?? (await fetchCsrfToken());
    headers.set(CSRF_HEADER, token);

    // jei siunčiam body – užtikrinam JSON headerį
    if (finalInit.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return fetch(input, finalInit);
}