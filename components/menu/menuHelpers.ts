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
