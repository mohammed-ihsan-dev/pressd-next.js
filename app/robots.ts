import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/siteMetadata";

// /admin is deliberately not disallowed: its pages send `noindex` (meta + X-Robots-Tag)
// and require sign-in. Blocking it here would stop crawlers from seeing that noindex,
// and a blocked URL can still be indexed from external links.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
