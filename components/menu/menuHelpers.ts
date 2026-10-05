import { prefersReducedMotion } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/data/menu";

export const FULL_CUSTOM_SLUGS = ["hot-beverages", "ice-beverages"];

export function customizeModeFor(category: MenuCategory, item: MenuItem): "full" | "milk-only" | "" {
  const isFullCustomDrink = FULL_CUSTOM_SLUGS.includes(category.slug);
  const isProteinShake = item[6] === "Protein Shakes";
  if (isProteinShake) return "milk-only";
  if (isFullCustomDrink) return "full";
  return "";
}

export function columnsFor(category: MenuCategory) {
  return [...new Set(category.items.map((item) => item[6]))];
}

export function columnId(category: MenuCategory, column: string) {
  return `${category.slug}-${column.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Scrolls a horizontal nav strip so `item` sits in its centre. Only the
 * strip moves (relative scrollBy, so it also works in RTL) — never the
 * page — and it is a no-op when the strip doesn't overflow.
 */
export function revealInStrip(strip: HTMLElement, item: HTMLElement) {
  if (strip.scrollWidth <= strip.clientWidth + 1) return;
  const s = strip.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  const delta = r.left + r.width / 2 - (s.left + s.width / 2);
  if (Math.abs(delta) < 2) return;
  strip.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
