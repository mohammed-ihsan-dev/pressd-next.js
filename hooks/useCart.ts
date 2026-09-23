"use client";

import { useCart as useCartFromContext } from "@/components/cart/CartContext";

export function useCart() {
  return useCartFromContext();
}
