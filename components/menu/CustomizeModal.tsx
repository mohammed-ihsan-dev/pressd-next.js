"use client";

import { useEffect, useRef, useState } from "react";
import { useMenuModals } from "@/components/menu/MenuModalsContext";
import { useCart } from "@/components/cart/CartContext";
import { readCustomizations, readInstructions, saveCustomizations, saveInstructions } from "@/lib/cart";
import {
  beanOptions,
  milkOptions,
  syrupOptions,
  customizationExtra,
  type Customization,
} from "@/lib/customization";

function OptionGroup({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: [string, number][];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="customize-options option-grid">
      {options.map(([option, price]) => (
        <label className="option-card" key={option}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={selected === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
          {price ? <b>+ {price.toFixed(2)} AED</b> : null}
        </label>
      ))}
    </div>
  );
}

export default function CustomizeModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { customizeProduct, customizeMode, closeCustomize } = useMenuModals();
  const { cart, applyCustomization } = useCart();

  const [beans, setBeans] = useState("Brazil");
  const [milk, setMilk] = useState("Fresh Milk");
  const [syrup, setSyrup] = useState("None");
  const [instructions, setInstructions] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!customizeProduct) {
      dialogRef.current?.close();
      return;
    }
    const defaults =
      customizeMode === "milk-only" ? { milk: "Fresh Milk" } : { beans: "Brazil", milk: "Fresh Milk", syrup: "None" };
    const stored = readCustomizations()[customizeProduct];
    const isMatchingSaved =
      stored &&
      (customizeMode === "milk-only"
        ? "mode" in stored && stored.mode === "milk-only"
        : "beans" in stored && stored.beans);
    const saved = isMatchingSaved ? stored : undefined;

    // Reading the saved selection from localStorage has to happen
    // client-side, triggered by which product/mode was opened — an
    // external-system read, not derivable state, so an effect is right here.
    /* eslint-disable react-hooks/set-state-in-effect */
    setBeans((saved && "beans" in saved && saved.beans) || defaults.beans || "Brazil");
    setMilk(saved?.milk || defaults.milk);
    setSyrup((saved && "syrup" in saved && saved.syrup) || (defaults as { syrup?: string }).syrup || "None");
    setInstructions(readInstructions()[customizeProduct] || "");
    setNote("");
    dialogRef.current?.showModal();
  }, [customizeProduct, customizeMode]);

  if (!customizeProduct) {
    return <dialog className="customize-modal" ref={dialogRef} aria-labelledby="customize-title" onClose={closeCustomize} />;
  }

  const extra =
    customizeMode === "milk-only"
      ? customizationExtra({ mode: "milk-only", milk, extraPrice: 0 })
      : customizationExtra({ beans, milk, syrup, extraPrice: 0 });

  const save = () => {
    const customization: Customization =
      customizeMode === "milk-only"
        ? { mode: "milk-only", milk, extraPrice: extra }
        : { beans, milk, syrup, extraPrice: extra };
    const trimmedInstructions = instructions.trim();

    const savedCustomizations = readCustomizations();
    savedCustomizations[customizeProduct] = customization;
    saveCustomizations(savedCustomizations);

    const savedInstructions = readInstructions();
    if (trimmedInstructions) savedInstructions[customizeProduct] = trimmedInstructions;
    else delete savedInstructions[customizeProduct];
    saveInstructions(savedInstructions);

    const cartItem = cart.find((item) => item.name === customizeProduct);
    if (cartItem) applyCustomization(customizeProduct, customization, trimmedInstructions);

    setNote("Your drink customization is saved.");
    setTimeout(() => dialogRef.current?.close(), 650);
  };

  return (
    <dialog
      className={`customize-modal${customizeMode === "milk-only" ? " milk-only-mode" : ""}`}
      ref={dialogRef}
      aria-labelledby="customize-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeCustomize();
      }}
      onClose={closeCustomize}
    >
      <button className="customize-close close-btn" type="button" aria-label="Close drink customization" onClick={closeCustomize}>
        ×
      </button>
      <div className="modal-header customize-header">
        <span className="customize-eyebrow eyebrow">MAKE IT YOURS</span>
        <h2 id="customize-title">Customize Your Drink</h2>
        <h3 className="customize-product-name product-name">{customizeProduct}</h3>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="customize-grid customize-content">
          {customizeMode !== "milk-only" && (
            <section className="custom-section coffee-section">
              <h4>COFFEE BEANS</h4>
              <OptionGroup name="beans" options={beanOptions} selected={beans} onChange={setBeans} />
            </section>
          )}
          <section className="custom-section milk-section">
            <h4>MILKS</h4>
            <OptionGroup name="milk" options={milkOptions} selected={milk} onChange={setMilk} />
          </section>
          {customizeMode !== "milk-only" && (
            <section className="custom-section add-on-section">
              <h4>SYRUPS</h4>
              <OptionGroup name="syrup" options={syrupOptions} selected={syrup} onChange={setSyrup} />
            </section>
          )}
          <section className="custom-section customize-comment comment-section">
            <h4>COMMENT / SPECIAL INSTRUCTIONS</h4>
            <p>Tell us what you’d like to reduce, remove, or add to this drink.</p>
            <textarea
              id="customize-instructions"
              name="instructions"
              maxLength={500}
              rows={4}
              placeholder="Add your comment or special instructions..."
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </section>
        </div>
        <p className="customize-note" aria-live="polite">
          {note}
        </p>
        <button className="customize-save save-btn" type="submit">
          SAVE SELECTION{extra ? ` · + AED ${extra.toFixed(2)}` : ""}
        </button>
      </form>
    </dialog>
  );
}
