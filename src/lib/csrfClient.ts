// src/lib/csrfClient.ts
import { CSRF_HEADER } from "@/lib/csrf";

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new Error(`CSRF token fetch failed (${res.status})`);
  }

  const json = (await res.json()) as { token?: string };
  if (!json?.token) {
    throw new Error("CSRF token missing in response");
  }

  return json.token;
}

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (!inflight) inflight = fetchCsrfToken();
  cachedToken = await inflight;
  inflight = null;
  return cachedToken;
}

export async function withCsrfHeaders(
  headers?: HeadersInit,
): Promise<Headers> {
  const token = await getCsrfToken();
  const h = new Headers(headers);

  // don’t overwrite content-type if caller set something else
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");

  h.set(CSRF_HEADER, token);
  return h;
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const h = await withCsrfHeaders(init.headers);

  return fetch(input, {
    ...init,
    headers: h,
    credentials: init.credentials ?? "same-origin",
    cache: init.cache ?? "no-store",
  });
}