"use client";

import { useCart } from "@/components/cart/CartContext";
import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";

export default function MobileDock() {
  const { quantity, openCart } = useCart();
  const handleLink = useSectionLinkHandler();

  return (
    <nav className="mobile-dock" aria-label="Mobile quick navigation">
      <a href="#home" onClick={handleLink("#home")}>
        <span>⌂</span>Home
      </a>
      <a href="#menu" onClick={handleLink("#menu")}>
        <span>≡</span>Menu
      </a>
      <button className="dock-cart" onClick={openCart}>
        <span>
          ▢<i>{quantity}</i>
        </span>
        Cart
      </button>
      <a
        href="https://wa.me/971556838426?text=Hello%20PRESS%27D!%20I%27d%20like%20to%20place%20an%20order."
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/assets/whatsapp-transparent.webp" alt="" />
        WhatsApp
      </a>
    </nav>
  );
}
