"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildWhatsappMessage,
  cartDetailsFor,
  cartImageFor,
  publicImageUrl,
  readCart,
  saveCart,
  WHATSAPP_NUMBER,
  type CartItem,
} from "@/lib/cart";
import { customizationExtra, type Customization } from "@/lib/customization";
import { readCustomizations, readInstructions } from "@/lib/cart";

interface AddToCartInput {
  name: string;
  basePrice: number;
  image: string;
}

interface CartContextValue {
  cart: CartItem[];
  quantity: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (input: AddToCartInput) => void;
  changeQty: (index: number, delta: 1 | -1) => void;
  applyCustomization: (name: string, customization: Customization, instructions: string) => void;
  whatsappHref: string;
  cartImageFor: typeof cartImageFor;
  cartDetailsFor: typeof cartDetailsFor;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Intentional one-time hydration from localStorage (unavailable during
    // SSR): starting from [] on the server and syncing here avoids a
    // server/client markup mismatch, which a lazy useState initializer would
    // reintroduce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(cart);
  }, [cart, hydrated]);

  const quantity = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const addToCart = useCallback(({ name, basePrice, image }: AddToCartInput) => {
    const instructions = readInstructions()[name] || "";
    const customization = readCustomizations()[name];
    const price = basePrice + customizationExtra(customization);
    setCart((prev) => {
      const existing = prev.find((item) => item.name === name);
      if (existing) {
        return prev.map((item) =>
          item.name === name
            ? { ...item, qty: item.qty + 1, basePrice, price, image: image || item.image, instructions, customization }
            : item
        );
      }
      return [...prev, { name, basePrice, price, image, instructions, customization, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((index: number, delta: 1 | -1) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  }, []);

  const applyCustomization = useCallback(
    (name: string, customization: Customization, instructions: string) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.name !== name) return item;
          const basePrice = item.basePrice ?? item.price - customizationExtra(item.customization);
          return {
            ...item,
            basePrice,
            price: basePrice + customizationExtra(customization),
            customization,
            instructions,
          };
        })
      );
    },
    []
  );

  const whatsappHref = useMemo(() => {
    if (!cart.length || typeof window === "undefined") return "#";
    const message = buildWhatsappMessage(cart, total, window.location.href);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }, [cart, total]);

  const value: CartContextValue = {
    cart,
    quantity,
    total,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addToCart,
    changeQty,
    applyCustomization,
    whatsappHref,
    cartImageFor,
    cartDetailsFor,
  };

  useEffect(() => {
    document.body.classList.toggle("cart-open", isOpen);
  }, [isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export { publicImageUrl };
