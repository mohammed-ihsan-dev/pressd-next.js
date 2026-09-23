import type { Metadata, Viewport } from "next";
import "./globals.css";

// Phase 1: loaded exactly as the original site did (same Google Fonts URL,
// same weights/styles), so text renders identically. Switching this to
// next/font/google is a safe, purely-technical follow-up for Phase 2 — it
// requires rewriting every literal "DM Sans" / Manrope / "Playfair Display"
// reference in globals.css to a CSS variable, which is out of scope for a
// 1:1 visual migration.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=Playfair+Display:ital,wght@1,500&display=swap";

export const metadata: Metadata = {
  title: "PRESS'D | Specialty Coffee & Café at Meydan Polo Residence",
  description:
    "PRESS'D is a wellness café at Meydan Polo Residence, Dubai, serving specialty coffee, fresh food and good energy in a pet-friendly, work-friendly space.",
  openGraph: {
    title: "PRESS'D | Wellness Café at Meydan Polo Residence",
    description:
      "Good food, good coffee, good company — all day at Meydan Polo Residence, Dubai.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbb019",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: "PRESS'D Wellness Café",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jumeirah Village Triangle",
    addressRegion: "Dubai",
    addressCountry: "AE",
  },
  servesCuisine: ["Healthy", "Breakfast", "Coffee"],
  openingHours: ["Mo-Th 07:00-23:00", "Fr-Su 07:00-00:00"],
  priceRange: "AED 18-65",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
        <link
          rel="preload"
          href="/assets/pressd-hero-cinematic.mp4?v=2"
          as="video"
          type="video/mp4"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="home-view">{children}</body>
    </html>
  );
}
