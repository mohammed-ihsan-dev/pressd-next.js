"use client";

import type { MenuCategory, MenuItem } from "@/data/menu";
import { useCart } from "@/components/cart/CartContext";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { customizeModeFor } from "@/components/menu/menuHelpers";

export default function ProductCard({ category, item }: { category: MenuCategory; item: MenuItem }) {
  const [name, description, price, image, tag, details] = item;
  const customizeMode = customizeModeFor(category, item);
  const { addToCart } = useCart();
  const { openDetails, openInstructions, openCustomize } = useMenuModals();

  const detailsPreview = (details?.ingredients || [description]).join(", ");

  return (
    <div
      className={`menu-card${customizeMode ? " customizable-card" : ""}`}
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
            className="add-cart"
            onClick={(event) => {
              event.stopPropagation();
              addToCart({ name, basePrice: price, image });
              const button = event.currentTarget;
              button.textContent = "Added ✓";
              setTimeout(() => {
                button.textContent = "Add +";
              }, 1200);
            }}
          >
            Add +
          </button>
        </div>
      </div>
    </div>
  );
}
