export default function DbMissing() {
  return (
    <div className="notice notice-error" role="alert">
      <h3>Database not configured</h3>
      <p>SEO Studio stores audits, issues, tasks and history in Postgres. Set DATABASE_URL (Neon via the Vercel Marketplace), run <code>npm run db:migrate</code> and redeploy.</p>
    </div>
  );
}
