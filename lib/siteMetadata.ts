import type { Metadata } from "next";

/** Canonical production origin (pressdcafe.ae and http:// both 308-redirect here). */
export const SITE_ORIGIN = "https://www.pressdcafe.ae";

// Default metadata for the public site (moved unchanged from app/(site)/layout.tsx).
// Values published from the SEO dashboard are layered on top of these at render
// time; with nothing published, the site renders exactly these.
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "PRESS'D | Specialty Coffee & Café at Meydan Polo Residence",
  description:
    "PRESS'D is a wellness café at Meydan Polo Residence, Dubai, serving specialty coffee, fresh food and good energy in a pet-friendly, work-friendly space.",
  // About, Menu and Visit are sections of this one page, so "/" is the only canonical URL.
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "PRESS'D | Wellness Café at Meydan Polo Residence",
    description:
      "Good food, good coffee, good company — all day at Meydan Polo Residence, Dubai.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/assets/our-cafe-cover.webp",
        width: 1536,
        height: 1024,
        alt: "A latte in a PRESS'D Wellness Café cup",
      },
    ],
  },
};
