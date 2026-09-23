"use client";

import { CartProvider } from "@/components/cart/CartContext";
import { BookingProvider } from "@/components/booking/BookingContext";
import { SectionNavProvider } from "@/components/navigation/SectionNavContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SectionNavProvider>
      <CartProvider>
        <BookingProvider>{children}</BookingProvider>
      </CartProvider>
    </SectionNavProvider>
  );
}
