import type { CartItem } from "@/types/cart";
import { cartDetailsFor, publicImageUrl, WHATSAPP_NUMBER } from "@/lib/cart";
import { customizationText } from "@/lib/customization";

export function formatWhatsappOrderMessage(cart: CartItem[], total: number, origin: string): string {
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

export function getWhatsappOrderUrl(cart: CartItem[], total: number, origin: string): string {
  if (!cart.length || typeof window === "undefined") return "#";
  const message = formatWhatsappOrderMessage(cart, total, origin);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
