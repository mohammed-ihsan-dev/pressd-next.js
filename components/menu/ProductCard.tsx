"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuCategory, MenuItem } from "@/data/menu";
import { useCart } from "@/components/cart/CartContext";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { customizeModeFor } from "@/components/menu/menuHelpers";
import { prefersReducedMotion } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function ProductCard({ category, item }: { category: MenuCategory; item: MenuItem }) {
  const [name, description, price, image, tag, details, , id] = item;
  const customizeMode = customizeModeFor(category, item);
  const { cart, addToCart } = useCart();
  const { openDetails, openInstructions, openCustomize } = useMenuModals();
  const { t, dict } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const displayName = t(`products.${id}.name`, name);
  const displayDescription = t(`products.${id}.description`, description);

  const cartItem = cart.find((c) => c.id === id);
  const isInCart = Boolean(cartItem && cartItem.qty > 0);

  const displayIngredients = dict?.products?.[id]?.ingredients || details?.ingredients;
  const detailsPreview = (displayIngredients || [displayDescription]).join(", ");

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (el.classList.contains("visible") || prefersReducedMotion()) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    addToCart({ id, name, basePrice: price, image });

    // Smooth flying temporary product image clone animation targeting the navbar cart icon
    const imgEl = cardRef.current?.querySelector<HTMLImageElement>(".menu-img img");
    const cartEl =
      document.querySelector<HTMLElement>(".navbar .cart-toggle") ||
      document.querySelector<HTMLElement>(".cart-toggle") ||
      document.querySelector<HTMLElement>(".dock-cart");

    if (imgEl && cartEl) {
      const imgRect = imgEl.getBoundingClientRect();
      const cartRect = cartEl.getBoundingClientRect();

      const fly = document.createElement("img");
      fly.src = image;
      fly.alt = displayName;
      fly.setAttribute("aria-hidden", "true");
      fly.className = "cart-fly-image";
      fly.style.position = "fixed";
      fly.style.zIndex = "999999";
      fly.style.top = `${imgRect.top}px`;
      fly.style.left = `${imgRect.left}px`;
      fly.style.width = `${imgRect.width}px`;
      fly.style.height = `${imgRect.height}px`;
      fly.style.borderRadius = "18px";
      fly.style.objectFit = "cover";
      fly.style.pointerEvents = "none";
      fly.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
      fly.style.transition = "all 0.6s cubic-bezier(0.2, 0.8, 0.25, 1)";
      fly.style.transform = "scale(1) rotate(0deg)";
      fly.style.opacity = "1";

      document.body.appendChild(fly);

      // Force reflow
      void fly.offsetWidth;

      const targetWidth = 36;
      const targetHeight = 36;
      const targetTop = cartRect.top + cartRect.height / 2 - targetHeight / 2;
      const targetLeft = cartRect.left + cartRect.width / 2 - targetWidth / 2;

      fly.style.top = `${targetTop}px`;
      fly.style.left = `${targetLeft}px`;
      fly.style.width = `${targetWidth}px`;
      fly.style.height = `${targetHeight}px`;
      fly.style.opacity = "0.2";
      fly.style.transform = "scale(0.35) rotate(12deg)";

      setTimeout(() => {
        fly.remove();

        const currentCartRect = cartEl.getBoundingClientRect();
        const centerX = currentCartRect.left + currentCartRect.width / 2;
        const centerY = currentCartRect.top + currentCartRect.height / 2;

        const ring = document.createElement("div");
        ring.className = "cart-arrival-pulse";
        ring.style.position = "fixed";
        ring.style.zIndex = "999999";
        ring.style.left = `${centerX}px`;
        ring.style.top = `${centerY}px`;
        ring.style.width = "14px";
        ring.style.height = "14px";
        ring.style.borderRadius = "50%";
        ring.style.border = "2px solid var(--orange, #ffb31a)";
        ring.style.boxShadow = "0 0 12px var(--orange, #ffb31a), inset 0 0 8px var(--orange, #ffb31a)";
        ring.style.transform = "translate(-50%, -50%) scale(0.5)";
        ring.style.opacity = "1";
        ring.style.pointerEvents = "none";
        ring.style.transition = "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)";

        document.body.appendChild(ring);
        void ring.offsetWidth;

        ring.style.transform = "translate(-50%, -50%) scale(3.2)";
        ring.style.opacity = "0";

        cartEl.classList.add("cart-arrival-pop");

        setTimeout(() => {
          ring.remove();
          cartEl.classList.remove("cart-arrival-pop");
        }, 500);
      }, 600);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`menu-card${isVisible ? " visible" : ""}${customizeMode ? " customizable-card" : ""}${isInCart ? " in-cart" : ""}`}
      data-cart-qty={cartItem?.qty || 0}
      role="button"
      tabIndex={0}
      aria-label={t("ui.detailsAria", "View details for {name}", { name: displayName })}
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
        <img src={image} alt={displayName} loading="lazy" />
        {tag && <span>{tag}</span>}
      </div>
      <div className="menu-card-info">
        <div className="product-summary">
          <h4>{displayName}</h4>
          <p className="product-details-preview">{detailsPreview}</p>
          <div className="product-controls">
            <button
              className="view-details"
              onClick={(event) => {
                event.stopPropagation();
                openDetails({ category, item });
              }}
            >
              {t("ui.details", "Details")} <span aria-hidden="true">↗</span>
            </button>
            {customizeMode ? (
              <button
                className="customize-product"
                onClick={(event) => {
                  event.stopPropagation();
                  openCustomize(id, customizeMode);
                }}
              >
                <span aria-hidden="true">⚙</span> {t("ui.customize", "Customize")}
              </button>
            ) : (
              <button
                className="comment-product"
                onClick={(event) => {
                  event.stopPropagation();
                  openInstructions(id);
                }}
              >
                <span aria-hidden="true">💬</span> {t("ui.comment", "Comment")}
              </button>
            )}
          </div>
        </div>
        <div className="menu-card-actions">
          <strong>{t("ui.currencyPrefix", "AED")} {price}</strong>
          <button
            className={`add-cart${isInCart ? " in-cart" : ""}`}
            onClick={handleAddToCart}
            aria-label={
              isInCart
                ? t("ui.inCartAria", "{name} is in cart", { name: displayName })
                : t("ui.addAria", "Add {name} to cart", { name: displayName })
            }
          >
            {isInCart ? `${t("ui.inCart", "In Cart")} ✓` : `${t("ui.addToCart", "Add")} +`}
          </button>
        </div>
      </div>
    </div>
  );
}

