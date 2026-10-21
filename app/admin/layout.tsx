import type { Metadata, Viewport } from "next";
import "./admin.css";

// Separate root layout: the admin never loads the public site's globals.css,
// scripts or structured data, and is never indexed.
export const metadata: Metadata = {
  title: { default: "SEO Studio · PRESS'D", template: "%s · PRESS'D SEO Studio" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: { icon: "/icon.png" },
};

export const viewport: Viewport = { themeColor: "#0a0a08", colorScheme: "dark" };

const FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap";

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONTS} rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
