// Applies the SEO dashboard migrations in ./drizzle to DATABASE_URL.
// Usage: DATABASE_URL=postgres://... npm run db:migrate
//
// Uses Neon's WebSocket driver so all pending migrations run inside ONE
// transaction: if anything fails, nothing is applied and it can simply be
// re-run. (The HTTP driver's migrator runs statements one by one, which can
// leave a half-created schema.) Already-applied migrations are skipped, so
// running it twice is safe. Only creates/alters the seo_* tables.

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
neonConfig.webSocketConstructor = WebSocket; // Node 22+ global

const target = new URL(url);
console.log(`Migrating database "${target.pathname.slice(1)}" on ${target.hostname} …`);
const pool = new Pool({ connectionString: url });
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  console.log("SEO dashboard migrations applied (or already up to date).");
} catch (e) {
  console.error("Migration failed; no changes were committed.", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
