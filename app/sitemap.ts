import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/siteMetadata";

// The public site has one indexable URL. About, Menu, Visit etc. are #sections of
// it, not pages, so they are not listed. No lastModified: it isn't tracked, and a
// build timestamp would misstate when the content changed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_ORIGIN}/` }];
}
