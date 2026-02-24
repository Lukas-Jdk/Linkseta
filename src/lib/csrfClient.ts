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

export async function withCsrfHeaders(headers?: HeadersInit): Promise<Headers> {
  const token = await getCsrfToken();
  const h = new Headers(headers);
  h.set(CSRF_HEADER, token);
  return h;
}

// universal fetch: prideda CSRF headerį, o Content-Type parenka saugiai
export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const h = await withCsrfHeaders(init.headers);

  // Jei body yra FormData – NEGALIMA nustatinėti Content-Type (boundary turi uždėti browseris)
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  // Jei body yra string/undefined ir nėra content-type – uždedam JSON default
  if (!isFormData && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers: h,
    credentials: init.credentials ?? "same-origin",
    cache: init.cache ?? "no-store",
  });
}