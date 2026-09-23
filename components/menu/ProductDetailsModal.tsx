"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { customizeModeFor } from "@/components/menu/menuHelpers";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function ProductDetailsModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { detailsProduct, closeDetails, openInstructions, openCustomize } = useMenuModals();
  const { addToCart } = useCart();
  const { t, dict, dir } = useLocale();

  useEffect(() => {
    if (detailsProduct) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [detailsProduct]);

  if (!detailsProduct) {
    return (
      <dialog
        className="product-details-modal"
        ref={dialogRef}
        aria-labelledby="product-modal-title"
        onClose={closeDetails}
      />
    );
  }

  const { category, item } = detailsProduct;
  const [name, description, price, image, , details, , id] = item;
  const displayName = t(`products.${id}.name`, name);
  const displayDescription = t(`products.${id}.description`, description);
  const displayIngredients = dict?.products?.[id]?.ingredients || details?.ingredients || [displayDescription];
  const customizeMode = customizeModeFor(category, item);
  const facts: [string, string | undefined][] = [
    [t("ui.factsSize", "Size"), details?.size],
    [t("ui.factsProtein", "Protein"), details?.protein],
    [t("ui.factsCarbohydrates", "Carbohydrates"), details?.carbohydrates],
    [t("ui.factsCalories", "Calories"), details?.calories],
  ];

  return (
    <dialog
      className="product-details-modal"
      ref={dialogRef}
      dir={dir}
      aria-labelledby="product-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDetails();
      }}
      onClose={closeDetails}
    >
      <button
        className="product-modal-close"
        type="button"
        aria-label={t("ui.closeDetailsAria", "Close product details")}
        onClick={closeDetails}
      >
        ×
      </button>
      <div className="product-modal-image">
        <img src={image} alt={displayName} />
      </div>
      <div className="product-modal-copy">
        <p className="product-modal-eyebrow">{t("ui.menuEyebrowModal", "PRESS'D MENU")}</p>
        <div className="product-modal-heading">
          <h2 id="product-modal-title">{displayName}</h2>
          <strong className="product-modal-price">
            {t("ui.currencyPrefix", "AED")} {price}
          </strong>
        </div>
        <p className="product-modal-description">{displayDescription}</p>
        <div className="product-modal-section">
          <h3>{t("ui.whatsInside", "What's inside")}</h3>
          <ul>
            {displayIngredients.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </div>
        <dl className="product-modal-facts">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        <div className="product-modal-actions">
          {customizeMode ? (
            <button
              className="customize-product"
              onClick={() => {
                closeDetails();
                openCustomize(id, customizeMode);
              }}
            >
              <span aria-hidden="true">⚙</span> {t("ui.customize", "Customize")}
            </button>
          ) : (
            <button
              className="comment-product"
              onClick={() => {
                closeDetails();
                openInstructions(id);
              }}
            >
              <span aria-hidden="true">💬</span> {t("ui.comment", "Comment")}
            </button>
          )}
          <button
            className="add-cart"
            onClick={() => {
              addToCart({ id, name, basePrice: price, image });
              closeDetails();
            }}
          >
            {t("ui.addToOrder", "Add to Order")} +
          </button>
        </div>
      </div>
    </dialog>
  );
}
