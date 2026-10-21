import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode, GoogleAuthError, safeEqual, verifyIdToken } from "@/lib/seo/auth/google";
import { currentViewer } from "@/lib/seo/auth/guard";
import { OAUTH_COOKIE, openOAuthState, sealSession, SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/seo/auth/session";
import { can, roleFor } from "@/lib/seo/core/permissions";
import { allowlist, googleOAuthConfig, sessionSecret } from "@/lib/seo/env";
import { getDb, gscDeps } from "@/lib/seo/server";
import { GscError, storeGrant } from "@/lib/seo/services/gsc";
import { logAdmin } from "@/lib/seo/services/log";

// Single redirect URI for both flows (GOOGLE_REDIRECT_URI must point here).
// Validates state (CSRF), PKCE verifier and the ID token's nonce/issuer/audience.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const secret = sessionSecret();
  const client = googleOAuthConfig();
  const saved = secret ? await openOAuthState(jar.get(OAUTH_COOKIE)?.value, secret) : null;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/admin/auth" }); // single use
  const to = (path: string, error?: string) => NextResponse.redirect(new URL(error ? `${path}?error=${encodeURIComponent(error)}` : path, req.url));
  const failPath = saved?.flow === "search_console" ? "/admin/seo/search-console" : "/admin/login";

  if (!secret || !client) return to("/admin/login", "not_configured");
  if (!saved) return to("/admin/login", "state_expired");
  const state = url.searchParams.get("state") ?? "";
  if (!safeEqual(state, saved.state)) return to(failPath, "state_mismatch");
  const googleError = url.searchParams.get("error");
  if (googleError) return to(failPath, googleError === "access_denied" ? "access_denied" : "google_error");
  const code = url.searchParams.get("code");
  if (!code) return to(failPath, "missing_code");

  let db;
  try {
    db = await getDb();
  } catch {
    return to(failPath, "database_unavailable");
  }

  try {
    const tokens = await exchangeCode(client, code, saved.verifier);
    if (!tokens.id_token) return to(failPath, "no_id_token");
    const identity = await verifyIdToken(tokens.id_token, client.clientId, saved.nonce);

    if (saved.flow === "login") {
      const role = roleFor(identity.email, allowlist().users);
      if (!role) {
        await logAdmin(db, identity.email, "login_denied", null, { reason: "not in SEO_ADMIN_USERS" });
        return to("/admin/login", "not_allowed");
      }
      jar.set(SESSION_COOKIE, await sealSession({ email: identity.email, name: identity.name }, secret), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_S,
      });
      await logAdmin(db, identity.email, "login", null, { role });
      return to("/admin/seo");
    }

    // Search Console grant: the admin who started it must still be signed in.
    const viewer = await currentViewer();
    if (!viewer || viewer.email !== saved.email || !can(viewer.role, "google:connect")) return to("/admin/login", "signin_required");
    await storeGrant(await gscDeps(), tokens, identity.email, viewer.email);
    await logAdmin(db, viewer.email, "gsc_connected", identity.email, { scopes: tokens.scope });
    return to("/admin/seo/search-console?connected=1");
  } catch (e) {
    const code = e instanceof GscError ? e.code : e instanceof GoogleAuthError ? e.code : "oauth_failed";
    console.error("[seo] OAuth callback failed:", code, e instanceof Error ? e.message : "");
    return to(failPath, code);
  }
}
