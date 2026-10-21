import { defineConfig } from "drizzle-kit";

// Generates SQL migrations for the SEO dashboard tables into ./drizzle.
// Apply them with `npm run db:migrate` (uses DATABASE_URL).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/seo/db/schema.ts",
  out: "./drizzle",
});
