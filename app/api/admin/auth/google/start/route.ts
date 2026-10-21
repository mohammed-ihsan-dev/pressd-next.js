import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthUrl, randomToken } from "@/lib/seo/auth/google";
import { currentViewer } from "@/lib/seo/auth/guard";
import { OAUTH_COOKIE, OAUTH_MAX_AGE_S, sealOAuthState } from "@/lib/seo/auth/session";
import { can } from "@/lib/seo/core/permissions";
import { googleOAuthConfig, sessionSecret } from "@/lib/seo/env";

// Starts Google OAuth. ?flow=login (sign-in) or ?flow=search_console
// (read-only Search Console grant; admins only, must already be signed in).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const flow = url.searchParams.get("flow") === "search_console" ? "search_console" : "login";
  const client = googleOAuthConfig();
  const secret = sessionSecret();
  const back = (path: string, error: string) => NextResponse.redirect(new URL(`${path}?error=${error}`, req.url));
  if (!client || !secret) return back(flow === "login" ? "/admin/login" : "/admin/seo/search-console", "not_configured");

  let email: string | undefined;
  if (flow === "search_console") {
    const viewer = await currentViewer();
    if (!viewer) return back("/admin/login", "signin_required");
    if (!can(viewer.role, "google:connect")) return back("/admin/seo/search-console", "forbidden");
    email = viewer.email;
  }
  const state = randomToken();
  const verifier = randomToken(48);
  const nonce = randomToken();
  (await cookies()).set(OAUTH_COOKIE, await sealOAuthState({ flow, state, verifier, nonce, email }, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from Google
    path: "/api/admin/auth",
    maxAge: OAUTH_MAX_AGE_S,
  });
  return NextResponse.redirect(buildAuthUrl(client, { flow, state, verifier, nonce, loginHint: email }));
}
