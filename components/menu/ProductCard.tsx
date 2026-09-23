"use client";

import { useRef } from "react";
import type { MenuCategory, MenuItem } from "@/data/menu";
import { useCart } from "@/components/cart/CartContext";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { customizeModeFor } from "@/components/menu/menuHelpers";

export default function ProductCard({ category, item }: { category: MenuCategory; item: MenuItem }) {
  const [name, description, price, image, tag, details] = item;
  const customizeMode = customizeModeFor(category, item);
  const { cart, addToCart } = useCart();
  const { openDetails, openInstructions, openCustomize } = useMenuModals();
  const cardRef = useRef<HTMLDivElement>(null);

  const cartItem = cart.find((c) => c.name === name);
  const isInCart = Boolean(cartItem && cartItem.qty > 0);

  const detailsPreview = (details?.ingredients || [description]).join(", ");

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    addToCart({ name, basePrice: price, image });

    // Smooth flying product image animation targeting the navbar cart icon
    const imgEl = cardRef.current?.querySelector<HTMLImageElement>(".menu-img img");
    const cartEl =
      document.querySelector<HTMLElement>(".navbar .cart-toggle") ||
      document.querySelector<HTMLElement>(".cart-toggle");

    if (imgEl && cartEl) {
      const imgRect = imgEl.getBoundingClientRect();
      const cartRect = cartEl.getBoundingClientRect();

      const fly = document.createElement("img");
      fly.src = image;
      fly.alt = name;
      fly.className = "cart-fly-image";
      fly.style.position = "fixed";
      fly.style.zIndex = "99999";
      fly.style.top = `${imgRect.top}px`;
      fly.style.left = `${imgRect.left}px`;
      fly.style.width = `${imgRect.width}px`;
      fly.style.height = `${imgRect.height}px`;
      fly.style.borderRadius = "16px";
      fly.style.objectFit = "cover";
      fly.style.pointerEvents = "none";
      fly.style.boxShadow = "0 10px 25px rgba(0,0,0,0.35)";
      fly.style.transition = "all 0.65s cubic-bezier(0.2, 0.8, 0.25, 1)";
      fly.style.transform = "scale(1) rotate(0deg)";
      fly.style.opacity = "1";

      document.body.appendChild(fly);

      // Force reflow
      void fly.offsetWidth;

      fly.style.top = `${cartRect.top + cartRect.height / 2 - 20}px`;
      fly.style.left = `${cartRect.left + cartRect.width / 2 - 20}px`;
      fly.style.width = "40px";
      fly.style.height = "40px";
      fly.style.opacity = "0.15";
      fly.style.transform = "scale(0.4) rotate(15deg)";

      setTimeout(() => {
        fly.remove();

        // Target arrival point centered on real cart icon
        const currentCartRect = cartEl.getBoundingClientRect();
        const centerX = currentCartRect.left + currentCartRect.width / 2;
        const centerY = currentCartRect.top + currentCartRect.height / 2;

        // Create elegant circular spark ring centered on cart icon
        const ring = document.createElement("div");
        ring.className = "cart-arrival-spark";
        ring.style.position = "fixed";
        ring.style.zIndex = "99999";
        ring.style.left = `${centerX}px`;
        ring.style.top = `${centerY}px`;
        ring.style.width = "12px";
        ring.style.height = "12px";
        ring.style.borderRadius = "50%";
        ring.style.border = "2px solid var(--orange, #ffb31a)";
        ring.style.boxShadow = "0 0 10px var(--orange, #ffb31a)";
        ring.style.transform = "translate(-50%, -50%) scale(0.6)";
        ring.style.opacity = "1";
        ring.style.pointerEvents = "none";
        ring.style.transition = "all 0.38s cubic-bezier(0.1, 0.85, 0.25, 1)";

        document.body.appendChild(ring);
        void ring.offsetWidth;

        ring.style.transform = "translate(-50%, -50%) scale(3.4)";
        ring.style.opacity = "0";

        // Subtle micro pop animation on cart button
        cartEl.classList.add("cart-arrival-pop");

        setTimeout(() => {
          ring.remove();
          cartEl.classList.remove("cart-arrival-pop");
        }, 400);
      }, 650);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`menu-card${customizeMode ? " customizable-card" : ""}${isInCart ? " in-cart" : ""}`}
      data-cart-qty={cartItem?.qty || 0}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${name}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button,a,input,textarea,select,label")) return;
        openDetails({ category, item });
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        openDetails({ category, item });
      }}
    >
      <div className="menu-img">
        <img src={image} alt={name} loading="lazy" />
        {tag && <span>{tag}</span>}
      </div>
      <div className="menu-card-info">
        <div className="product-summary">
          <h4>{name}</h4>
          <p className="product-details-preview">{detailsPreview}</p>
          <div className="product-controls">
            <button
              className="view-details"
              onClick={(event) => {
                event.stopPropagation();
                openDetails({ category, item });
              }}
            >
              Details <span aria-hidden="true">↗</span>
            </button>
            {customizeMode ? (
              <button
                className="customize-product"
                onClick={(event) => {
                  event.stopPropagation();
                  openCustomize(name, customizeMode);
                }}
              >
                <span aria-hidden="true">⚙</span> Customize
              </button>
            ) : (
              <button
                className="comment-product"
                onClick={(event) => {
                  event.stopPropagation();
                  openInstructions(name);
                }}
              >
                <span aria-hidden="true">💬</span> Comment
              </button>
            )}
          </div>
        </div>
        <div className="menu-card-actions">
          <strong>AED {price}</strong>
          <button
            className={`add-cart${isInCart ? " in-cart" : ""}`}
            onClick={handleAddToCart}
            aria-label={isInCart ? `${name} is in cart` : `Add ${name} to cart`}
          >
            {isInCart ? "In Cart ✓" : "Add +"}
          </button>
        </div>
      </div>
    </div>
  );
}
