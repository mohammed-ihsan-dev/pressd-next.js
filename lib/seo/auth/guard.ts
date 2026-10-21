import "server-only";
// Authorization for every SEO page and API route (the Data Access Layer).
// proxy.ts only does an optimistic cookie-presence check; the real decision
// is made here, on the server, for each request.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection, NextResponse } from "next/server";
import { can, roleFor, type Permission, type Role } from "../core/permissions.ts";
import { allowlist, sessionSecret } from "../env.ts";
import { openSession, SESSION_COOKIE } from "./session.ts";

export interface Viewer {
  email: string;
  name: string | null;
  role: Role;
}

/** The signed-in, still-allowlisted user, or null. Memoised per request. */
export const currentViewer = cache(async (): Promise<Viewer | null> => {
  // Read the request first, so any page that checks auth is always rendered
  // per request — never prerendered at build time (e.g. when env is missing).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const secret = sessionSecret();
  if (!secret) return null;
  const session = await openSession(token, secret);
  if (!session) return null;
  const role = roleFor(session.email, allowlist().users);
  if (!role) return null; // removed from SEO_ADMIN_USERS → access ends immediately
  return { email: session.email, name: session.name, role };
});

export class Forbidden extends Error {
  readonly permission: Permission;
  constructor(permission: Permission) {
    super(`Missing permission ${permission}`);
    this.permission = permission;
  }
}

/** For server components: redirects to sign-in, or throws Forbidden (rendered by the page). */
export async function requirePage(permission: Permission = "reports:read"): Promise<Viewer> {
  await connection();
  const viewer = await currentViewer();
  if (!viewer) redirect("/admin/login");
  if (!can(viewer.role, permission)) throw new Forbidden(permission);
  return viewer;
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });
}

/**
 * For route handlers. Returns the viewer or a ready-made error response.
 * State-changing methods also require a same-origin request (CSRF defence in
 * depth on top of the SameSite=Lax session cookie).
 */
export async function requireApi(req: Request, permission: Permission): Promise<Viewer | NextResponse> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return jsonError(403, "bad_origin", "Cross-site request refused");
  }
  const viewer = await currentViewer();
  if (!viewer) return jsonError(401, "unauthenticated", "Sign in required");
  if (!can(viewer.role, permission)) return jsonError(403, "forbidden", `Your role (${viewer.role}) cannot do this`);
  return viewer;
}
