export interface MenuDictionary {
  categories: Record<string, string>;
  categoryTaglines: Record<string, string>;
  subcategories: Record<string, string>;
  products: Record<string, { name: string; description: string; ingredients?: string[] }>;
  customization: {
    beans: Record<string, string>;
    milk: Record<string, string>;
    syrup: Record<string, string>;
  };
  ui: Record<string, string>;
}

/** Dynamically imports one locale's dictionary so unused languages never ship to the client. */
export async function loadDictionary(code: string): Promise<MenuDictionary> {
  const mod = await import(`@/locales/${code}/menu.json`);
  return (mod.default ?? mod) as MenuDictionary;
}
