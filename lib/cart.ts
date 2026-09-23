// Cart data model + localStorage persistence. Keys are unchanged from the
// original site so existing customers' carts survive the migration:
//   pressd-cart, pressd-customizations, pressd-instructions
import { menu, type MenuItem } from "@/data/menu";
import {
  customizationExtra,
  customizationText,
  sanitizeCustomization,
  type Customization,
} from "@/lib/customization";

export const STORAGE_KEYS = {
  cart: "pressd-cart",
  customizations: "pressd-customizations",
  instructions: "pressd-instructions",
} as const;

export interface CartItem {
  name: string;
  basePrice: number;
  price: number;
  image: string;
  instructions: string;
  customization: Customization;
  qty: number;
}

const menuItemByName = new Map<string, MenuItem>(
  menu.flatMap((category) => category.items.map((item) => [item[0], item] as const))
);

export const cartMenuItem = (item: { name: string }) => menuItemByName.get(item.name);
export const cartImageFor = (item: CartItem) => item.image || cartMenuItem(item)?.[3] || "";
export const cartDetailsFor = (item: CartItem) => cartMenuItem(item)?.[1] || "";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "[]") as CartItem[];
    return parsed.map((item) => {
      const customization = item.customization;
      if (!customization || !("beans" in customization) || !customization.beans) return item;
      const oldExtra = Number((customization as { extraPrice?: number }).extraPrice || 0);
      const basePrice = item.basePrice ?? item.price - oldExtra;
      const sanitized = sanitizeCustomization(customization);
      return {
        ...item,
        basePrice,
        price: basePrice + customizationExtra(sanitized),
        customization: sanitized,
      };
    });
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

export function readInstructions(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.instructions) || "{}");
  } catch {
    return {};
  }
}

export function saveInstructions(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.instructions, JSON.stringify(value));
}

export function readCustomizations(): Record<string, Customization> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.customizations) || "{}") as Record<
      string,
      Customization
    >;
    return Object.fromEntries(
      Object.entries(raw).map(([product, customization]) => [
        product,
        sanitizeCustomization(customization),
      ])
    );
  } catch {
    return {};
  }
}

export function saveCustomizations(value: Record<string, Customization>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.customizations, JSON.stringify(value));
}

export const escapeCartText = (value: string) =>
  String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char
  );

export function publicImageUrl(item: CartItem, origin: string) {
  const image = cartImageFor(item);
  return image ? new URL(image, origin).href : "";
}

export const WHATSAPP_NUMBER = "971556838426";

export function buildWhatsappMessage(cart: CartItem[], total: number, origin: string) {
  const lines = cart.map((item) => {
    const details = cartDetailsFor(item);
    const customizationLine = item.customization
      ? `\n  Customized: ${customizationText(item.customization)}`
      : "";
    const instructionsLine = item.instructions
      ? `\n  Special instructions: ${item.instructions}`
      : "";
    return `• ${item.name} x${item.qty} — AED ${item.price * item.qty}\n  Details: ${details}${customizationLine}${instructionsLine}\n  Image: ${publicImageUrl(item, origin)}`;
  });
  return `Hello PRESS'D! I'd like to order:\n\n${lines.join(
    "\n\n"
  )}\n\nTotal: AED ${total}\n\nPlease confirm availability and delivery/pickup details.`;
}
