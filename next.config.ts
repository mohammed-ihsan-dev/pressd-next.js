import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Local-development database for the SEO dashboard (WASM Postgres); loaded
  // from node_modules at runtime instead of being bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // The public site and /admin use separate root layouts, so unmatched
    // URLs are served by app/global-not-found.tsx.
    globalNotFound: true,
  },
};

export default nextConfig;
