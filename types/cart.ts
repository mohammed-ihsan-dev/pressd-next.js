import type { Customization } from "@/lib/customization";

export interface CartItem {
  name: string;
  basePrice: number;
  price: number;
  image: string;
  instructions: string;
  customization: Customization;
  qty: number;
}

export interface CartContextValue {
  cart: CartItem[];
  quantity: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: {
    name: string;
    basePrice: number;
    price: number;
    image: string;
    instructions?: string;
    customization?: Customization;
  }) => void;
  changeQty: (index: number, delta: number) => void;
  applyCustomization: (name: string, customization: Customization, instructions: string) => void;
  whatsappHref: string;
  cartImageFor: (item: CartItem) => string;
}
