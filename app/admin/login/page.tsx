import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/seo/auth/guard";
import { allowlist, googleOAuthConfig, sessionSecret } from "@/lib/seo/env";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  not_allowed: "That Google account is not on the SEO Studio access list. Ask the site owner to add it to SEO_ADMIN_USERS.",
  not_configured: "Sign-in is not configured yet (Google OAuth or session secret missing). See the setup guide.",
  state_expired: "The sign-in attempt expired. Please try again.",
  state_mismatch: "The sign-in response did not match this browser session. Please try again.",
  access_denied: "Google sign-in was cancelled.",
  unverified_email: "Your Google account email address is not verified.",
  signin_required: "Please sign in first.",
  database_unavailable: "The dashboard database is not available.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await currentViewer()) redirect("/admin/seo");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const configured = !!googleOAuthConfig() && !!sessionSecret() && allowlist().users.size > 0;
  return (
    <main className="login">
      <div className="login-card">
        <p className="eyebrow">PRESS&apos;D Wellness Café</p>
        <h1 className="page-title">SEO Studio</h1>
        <p className="muted" style={{ margin: "12px 0 24px" }}>
          Internal tools for auditing and improving pressdcafe.ae. Access is limited to approved Google accounts.
        </p>
        {sp.signed_out ? <div className="notice notice-good" role="status"><p>You have been signed out.</p></div> : null}
        {error ? (
          <div className="notice notice-error" role="alert">
            <p>{MESSAGES[error] ?? "Sign-in failed. Please try again."}</p>
          </div>
        ) : null}
        {configured ? (
          <a className="btn btn-primary" href="/api/admin/auth/google/start?flow=login">
            Sign in with Google
          </a>
        ) : (
          <div className="notice" role="status">
            <h3>Setup required</h3>
            <p>Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, SEO_SESSION_SECRET and SEO_ADMIN_USERS, then redeploy. See docs/seo-studio-setup.md.</p>
          </div>
        )}
      </div>
    </main>
  );
}
