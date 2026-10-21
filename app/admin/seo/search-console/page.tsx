import type { Metadata } from "next";
import DbMissing from "@/components/seo/DbMissing";
import { DisconnectButton, GscReportView, PropertyPicker } from "@/components/seo/GscPanel";
import PageHead from "@/components/seo/PageHead";
import { requirePage } from "@/lib/seo/auth/guard";
import { can } from "@/lib/seo/core/permissions";
import { googleOAuthConfig, siteUrl } from "@/lib/seo/env";
import { dbOrNull } from "@/lib/seo/page-data";
import { gscMissingConfig } from "@/lib/seo/server";
import { connectionView } from "@/lib/seo/services/gsc";

export const metadata: Metadata = { title: "Search Console" };

const ERRORS: Record<string, string> = {
  insufficient_scope: "Search Console read access was not granted. Reconnect and leave the Search Console permission ticked.",
  no_refresh_token: "Google did not return a refresh token. Remove PRESS'D SEO Studio under myaccount.google.com/permissions, then reconnect.",
  access_denied: "The Google consent screen was cancelled.",
  forbidden: "Only admins can connect Search Console.",
  not_configured: "Google OAuth or the token encryption key is not configured.",
  state_mismatch: "The connection response did not match this session. Try again.",
};

export default async function SearchConsolePage({ searchParams }: PageProps<"/admin/seo/search-console">) {
  const viewer = await requirePage("reports:read");
  const sp = await searchParams;
  const db = await dbOrNull();
  if (!db) return (<><PageHead eyebrow="SEO Studio" title="Search Console" /><DbMissing /></>);
  const missing = gscMissingConfig();
  const conn = await connectionView(db);
  const canConnect = can(viewer.role, "google:connect");
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHead
        eyebrow="SEO Studio"
        title="Search Console"
        lede="Clicks, impressions, CTR and average position from Google Search Console (read-only). Nothing is shown until a property for pressdcafe.ae is connected — there is no sample data."
        actions={conn.state === "connected" && canConnect ? <DisconnectButton /> : null}
      />
      {error ? <div className="notice notice-error" role="alert"><p>{ERRORS[error] ?? `Connection failed (${error}).`}</p></div> : null}
      {sp.connected ? <div className="notice notice-good" role="status"><p>Google access granted. Choose the property below to finish connecting.</p></div> : null}

      {missing.length ? (
        <div className="notice" role="status">
          <h3>Not configured</h3>
          <p>Missing: {missing.join(", ")}.</p>
          <p>Set these in the deployment environment and redeploy. Setup steps: docs/seo-studio-setup.md.</p>
        </div>
      ) : conn.state === "disconnected" ? (
        <section className="section-block">
          <h2 className="section">Connect Google Search Console</h2>
          <ol className="muted" style={{ paddingLeft: 18, maxWidth: "70ch" }}>
            <li>The Google account you connect must be a verified Owner or Full/Restricted user of a Search Console property covering {siteUrl().host} (a Domain property for pressdcafe.ae, or the URL-prefix property {siteUrl().origin}/).</li>
            <li>SEO Studio requests read-only access ({`webmasters.readonly`}). It never submits sitemaps or changes Search Console settings.</li>
            <li>Tokens are encrypted (AES-256-GCM) and stored server-side only. Disconnecting deletes them and revokes access at Google.</li>
          </ol>
          {canConnect ? (
            <a className="btn btn-primary" href="/api/admin/auth/google/start?flow=search_console">Connect with Google</a>
          ) : (
            <p className="hint">Ask an admin to connect Search Console.</p>
          )}
          {googleOAuthConfig() ? <p className="small faint" style={{ marginTop: 12 }}>OAuth redirect URI in use: {googleOAuthConfig()!.redirectUri}</p> : null}
        </section>
      ) : conn.state === "error" ? (
        <div className="notice notice-error" role="alert">
          <h3>Connection needs attention</h3>
          <p>{conn.message}</p>
          {canConnect ? <a className="btn btn-primary" href="/api/admin/auth/google/start?flow=search_console">Reconnect</a> : <p>Ask an admin to reconnect.</p>}
        </div>
      ) : conn.state === "needs_property" ? (
        <section className="section-block">
          <h2 className="section">Choose the PRESS&apos;D property</h2>
          <p className="muted">Connected as {conn.googleEmail}. Only properties that cover {siteUrl().host} and where this account is verified can be used.</p>
          {canConnect ? <PropertyPicker /> : <p className="hint">Ask an admin to choose the property.</p>}
        </section>
      ) : conn.state === "connected" ? (
        <>
          <p className="small muted">Connected as {conn.googleEmail} · property {conn.propertyUrl} ({conn.permission}) · by {conn.connectedBy}</p>
          <GscReportView canInspect={can(viewer.role, "audit:run")} />
        </>
      ) : null}
    </>
  );
}
