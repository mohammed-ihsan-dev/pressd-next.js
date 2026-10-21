"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/seo", label: "Overview" },
  { href: "/admin/seo/audit", label: "Technical audit" },
  { href: "/admin/seo/search-console", label: "Search Console" },
  { href: "/admin/seo/pages", label: "Pages & metadata" },
  { href: "/admin/seo/performance", label: "Performance" },
  { href: "/admin/seo/tasks", label: "Tasks" },
  { href: "/admin/seo/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="seo-nav" aria-label="SEO Studio">
      {ITEMS.map((item) => {
        const active = item.href === "/admin/seo" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
