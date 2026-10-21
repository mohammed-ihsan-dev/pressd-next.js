"use client";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/** JSON call to the SEO API. Never throws; errors come back as readable messages. */
export async function api<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    const error = res.ok ? null : res.status === 401 ? "Your session has expired — reload the page to sign in again." : json?.error?.message ?? `Request failed (${res.status})`;
    return { ok: res.ok, status: res.status, data: json, error };
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error — check your connection and try again." };
  }
}

export function fmtDate(iso: string | Date | null | undefined, withTime = true): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
