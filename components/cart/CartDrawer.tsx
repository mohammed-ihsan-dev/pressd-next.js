"use client";

import { useCart } from "@/components/cart/CartContext";
import { escapeCartText, cartImageFor } from "@/lib/cart";
import { customizationText } from "@/lib/customization";

export default function CartDrawer() {
  const { cart, quantity, total, isOpen, closeCart, changeQty, whatsappHref } = useCart();

  return (
    <>
      <div
        className={`cart-backdrop${isOpen ? " open" : ""}`}
        aria-hidden="true"
        onClick={closeCart}
      />
      <aside
        className={`cart-drawer${isOpen ? " open" : ""}`}
        aria-hidden={!isOpen}
        aria-labelledby="cart-title"
      >
        <header>
          <div>
            <p>YOUR ORDER</p>
            <h2 id="cart-title">
              CART <span className="cart-heading-count">{quantity}</span>
            </h2>
          </div>
          <button className="cart-close" aria-label="Close cart" onClick={closeCart}>
            ×
          </button>
        </header>
        <div className="cart-items" hidden={!cart.length}>
          {cart.map((item, index) => (
            <article className="cart-item" key={`${item.name}-${index}`}>
              <img
                className="cart-item-image"
                src={cartImageFor(item)}
                alt={escapeCartText(item.name)}
              />
              <div className="cart-item-copy">
                <h3>{item.name}</h3>
                <p>AED {item.price}</p>
                {item.customization && (
                  <p className="cart-item-customization">
                    <b>Customized:</b> {customizationText(item.customization)}
                  </p>
                )}
                {item.instructions && (
                  <p className="cart-item-instructions">
                    <b>Special instructions:</b> {item.instructions}
                  </p>
                )}
              </div>
              <div className="cart-quantity">
                <button
                  data-cart-action="minus"
                  aria-label={`Remove one ${item.name}`}
                  onClick={() => changeQty(index, -1)}
                >
                  −
                </button>
                <span>{item.qty}</span>
                <button
                  data-cart-action="plus"
                  aria-label={`Add one ${item.name}`}
                  onClick={() => changeQty(index, 1)}
                >
                  +
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="cart-empty" hidden={cart.length > 0}>
          Your cart is empty.
          <br />
          <a href="#menu">Explore the menu →</a>
        </div>
        <footer>
          <div className="cart-total">
            <span>Total</span>
            <strong>AED {total}</strong>
          </div>
          <a
            className={`whatsapp-order${cart.length ? "" : " disabled"}`}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!cart.length}
            onClick={(event) => {
              if (!cart.length) event.preventDefault();
            }}
          >
            <img src="/assets/whatsapp-transparent.webp" alt="" />
            Order on WhatsApp
          </a>
          <small>Order will be sent to +971 55 683 8426</small>
        </footer>
      </aside>
    </>
  );
}
