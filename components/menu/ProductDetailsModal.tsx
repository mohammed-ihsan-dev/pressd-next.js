"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { customizeModeFor } from "@/components/menu/menuHelpers";

export default function ProductDetailsModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { detailsProduct, closeDetails, openInstructions, openCustomize } = useMenuModals();
  const { addToCart } = useCart();

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
  const [name, description, price, image, , details] = item;
  const customizeMode = customizeModeFor(category, item);
  const facts: [string, string | undefined][] = [
    ["Size", details?.size],
    ["Protein", details?.protein],
    ["Carbohydrates", details?.carbohydrates],
    ["Calories", details?.calories],
  ];

  return (
    <dialog
      className="product-details-modal"
      ref={dialogRef}
      aria-labelledby="product-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDetails();
      }}
      onClose={closeDetails}
    >
      <button className="product-modal-close" type="button" aria-label="Close product details" onClick={closeDetails}>
        ×
      </button>
      <div className="product-modal-image">
        <img src={image} alt={name} />
      </div>
      <div className="product-modal-copy">
        <p className="product-modal-eyebrow">PRESS’D MENU</p>
        <div className="product-modal-heading">
          <h2 id="product-modal-title">{name}</h2>
          <strong className="product-modal-price">AED {price}</strong>
        </div>
        <p className="product-modal-description">{description}</p>
        <div className="product-modal-section">
          <h3>What’s inside</h3>
          <ul>
            {(details?.ingredients || [description]).map((value) => (
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
                openCustomize(name, customizeMode);
              }}
            >
              <span aria-hidden="true">⚙</span> Customize
            </button>
          ) : (
            <button
              className="comment-product"
              onClick={() => {
                closeDetails();
                openInstructions(name);
              }}
            >
              <span aria-hidden="true">💬</span> Comment
            </button>
          )}
          <button
            className="add-cart"
            onClick={() => {
              addToCart({ name, basePrice: price, image });
              closeDetails();
            }}
          >
            Add to Order +
          </button>
        </div>
      </div>
    </dialog>
  );
}
