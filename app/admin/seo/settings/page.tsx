import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import DbMissing from "@/components/seo/DbMissing";
import PageHead from "@/components/seo/PageHead";
import SettingsForm from "@/components/seo/SettingsForm";
import { requirePage } from "@/lib/seo/auth/guard";
import { can, permissionsFor, ROLES } from "@/lib/seo/core/permissions";
import { adminLog } from "@/lib/seo/db/schema";
import { allowlist, configStatus } from "@/lib/seo/env";
import { dbOrNull } from "@/lib/seo/page-data";
import { getSettings } from "@/lib/seo/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requirePage("reports:read");
  const isAdmin = can(viewer.role, "settings:manage");
  const checks = configStatus();
  const db = await dbOrNull();
  const settings = db ? await getSettings(db) : null;
  const log = db && isAdmin ? await db.select().from(adminLog).orderBy(desc(adminLog.at)).limit(40) : [];
  const al = allowlist();

  return (
    <>
      <PageHead eyebrow="SEO Studio" title="Settings" lede="Integration status, audit configuration and access. Secrets are never displayed — only whether each one is set." />

      <section className="section-block">
        <h2 className="section">Configuration</h2>
        <div className="table-wrap">
          <table className="data stack">
            <thead><tr><th scope="col">Environment variable</th><th scope="col">Required</th><th scope="col">Status</th></tr></thead>
            <tbody>{checks.map((c) => (
              <tr key={c.name}>
                <td data-label="Variable" className="mono">{c.name}</td>
                <td data-label="Required">{c.required ? "yes" : "optional"}</td>
                <td data-label="Status"><span className={`tag ${c.ok ? "tag-good" : c.required ? "tag-bad" : "tag-amber"}`}>{c.ok ? "ok" : "needs attention"}</span> <span className="small muted">{c.note}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {isAdmin && al.errors.length ? <div className="notice notice-error" style={{ marginTop: 12 }}><p>SEO_ADMIN_USERS problems: {al.errors.join("; ")}</p></div> : null}
      </section>

      <section className="section-block">
        {!db || !settings ? <DbMissing /> : <SettingsForm thresholds={{ ...settings.thresholds }} limits={{ ...settings.crawlLimits }} canEdit={isAdmin} />}
      </section>

      <section className="section-block">
        <h2 className="section">Roles</h2>
        <div className="table-wrap"><table className="data stack">
          <thead><tr><th scope="col">Role</th><th scope="col">Can</th></tr></thead>
          <tbody>{ROLES.map((r) => <tr key={r}><td data-label="Role"><b>{r}</b>{r === viewer.role ? <span className="tag tag-amber" style={{ marginLeft: 8 }}>you</span> : null}</td><td data-label="Can" className="small">{permissionsFor(r).join(", ")}</td></tr>)}</tbody>
        </table></div>
        {isAdmin ? <p className="small muted">{al.users.size} account(s) currently allowed: {[...al.users.entries()].map(([e, r]) => `${e} (${r})`).join(", ")}. Edit SEO_ADMIN_USERS and redeploy to change access.</p> : null}
      </section>

      {isAdmin ? (
        <section className="section-block">
          <h2 className="section">Admin activity log</h2>
          {!log.length ? <div className="empty">No activity recorded yet.</div> : (
            <div className="table-wrap"><table className="data stack">
              <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th></tr></thead>
              <tbody>{log.map((e) => (
                <tr key={e.id}><td data-label="When" className="small">{e.at.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</td><td data-label="Who" className="small">{e.actor}</td><td data-label="Action">{e.action.replace(/_/g, " ")}</td><td data-label="Target" className="small wrap-anywhere">{e.target ?? "—"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      ) : null}
    </>
  );
}
