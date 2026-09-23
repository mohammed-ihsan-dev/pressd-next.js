"use client";

import { CartProvider } from "@/components/cart/CartContext";
import { BookingProvider } from "@/components/booking/BookingContext";
import { SectionNavProvider } from "@/components/navigation/SectionNavContext";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SectionNavProvider>
      <LocaleProvider>
        <CartProvider>
          <BookingProvider>{children}</BookingProvider>
        </CartProvider>
      </LocaleProvider>
    </SectionNavProvider>
  );
}
