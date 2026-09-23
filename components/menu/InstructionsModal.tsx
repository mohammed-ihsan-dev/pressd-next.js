"use client";

import { useEffect, useRef, useState } from "react";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { useCart } from "@/components/cart/CartContext";
import { readInstructions, saveInstructions } from "@/lib/cart";

export default function InstructionsModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { instructionsProduct, closeInstructions } = useMenuModals();
  const { cart, applyCustomization } = useCart();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    // Reading the saved draft from localStorage has to happen client-side,
    // triggered by which product the customer opened — an external-system
    // read, not derivable state, so an effect is the right tool here.
    if (instructionsProduct) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(readInstructions()[instructionsProduct] || "");
      setNote("");
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [instructionsProduct]);

  const save = () => {
    if (!instructionsProduct) return;
    const saved = readInstructions();
    const trimmed = value.trim();
    if (trimmed) saved[instructionsProduct] = trimmed;
    else delete saved[instructionsProduct];
    saveInstructions(saved);

    const cartItem = cart.find((item) => item.name === instructionsProduct);
    if (cartItem) applyCustomization(instructionsProduct, cartItem.customization, trimmed);

    setNote("Instructions saved.");
    setTimeout(() => dialogRef.current?.close(), 700);
  };

  return (
    <dialog
      className="instructions-modal"
      ref={dialogRef}
      aria-labelledby="instructions-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeInstructions();
      }}
      onClose={closeInstructions}
    >
      <button
        className="instructions-close"
        type="button"
        aria-label="Close special instructions"
        onClick={closeInstructions}
      >
        ×
      </button>
      <p className="instructions-eyebrow">CUSTOMISE YOUR ORDER</p>
      <h2 id="instructions-title">Special Instructions</h2>
      <p className="instructions-product">{instructionsProduct}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label htmlFor="product-instructions">
          Tell us what you’d like to reduce, remove, or add to this product…
        </label>
        <textarea
          id="product-instructions"
          name="instructions"
          maxLength={500}
          rows={5}
          placeholder="Tell us what you’d like to reduce, remove, or add to this product…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="instructions-note" aria-live="polite">
          {note}
        </p>
        <div>
          <button type="button" className="instructions-cancel" onClick={closeInstructions}>
            Cancel
          </button>
          <button type="submit">Save Instructions</button>
        </div>
      </form>
    </dialog>
  );
}
