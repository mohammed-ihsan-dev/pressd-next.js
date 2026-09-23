"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useBooking } from "@/components/booking/BookingContext";
import { useSectionLinkHandler, useSectionNav } from "@/components/navigation/SectionNavContext";

const NAV_LINKS = [
  { href: "#menu", label: "Menu" },
  { href: "#about", label: "Our Café" },
  { href: "#pets", label: "Pet Friendly" },
  { href: "#work", label: "Work & Chill" },
  { href: "#visit", label: "Visit" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { quantity, openCart } = useCart();
  const { openBooking } = useBooking();
  const { activeSection } = useSectionNav();
  const handleLink = useSectionLinkHandler();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", mobileOpen);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header
        className={`navbar${scrolled ? " scrolled" : ""}`}
        aria-label="Main navigation"
      >
        <a
          className="logo"
          href="#home"
          aria-label="PRESS'D home"
          onClick={handleLink("#home")}
        >
          <img src="/assets/pressd-logo.webp" alt="PRESS'D Wellness Café" />
        </a>
        <nav className="desktop-nav">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={[link.href === "#menu" ? "nav-link-menu" : "", isActive ? "active" : ""]
                  .filter(Boolean)
                  .join(" ") || undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={handleLink(link.href)}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="nav-actions">
          <button className="cart-toggle" aria-label="Open shopping cart" onClick={openCart}>
            Cart <span>{quantity}</span>
          </button>
          <button className="book-btn" onClick={openBooking}>
            Book a table <span>↗</span>
          </button>
        </div>
        <button
          className="menu-toggle"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <i></i>
          <i></i>
        </button>
      </header>
      <div className={`mobile-menu${mobileOpen ? " open" : ""}`} aria-hidden={!mobileOpen}>
        <nav>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => {
                handleLink(link.href)(event);
                closeMobile();
              }}
            >
              {link.label}
            </a>
          ))}
          <div className="mobile-menu-actions">
            <button
              className="cart-toggle"
              aria-label="Open shopping cart"
              onClick={() => {
                closeMobile();
                openCart();
              }}
            >
              Cart <span>{quantity}</span>
            </button>
            <button
              className="book-btn"
              onClick={() => {
                closeMobile();
                openBooking();
              }}
            >
              Book a table <span>↗</span>
            </button>
          </div>
        </nav>
        <p>Meydan Polo Residence, Dubai · Open daily from 7AM</p>
      </div>
    </>
  );
}
