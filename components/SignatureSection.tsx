"use client";

import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";

export default function SignatureSection() {
  const handleLink = useSectionLinkHandler();
  return (
    <section className="signature">
      <img src="/assets/avocado-toast.webp" alt="PRESS'D signature avocado toast" loading="lazy" />
      <div className="signature-shade" />
      <div className="signature-copy reveal">
        <p className="eyebrow">SALADS · PROTEIN · BREAKFAST · SMOOTHIES</p>
        <h2>
          COLOURFUL.
          <br />
          CLEAN.
          <br />
          <em>CRAVEABLE.</em>
        </h2>
        <p>From protein-first lunches to bright breakfasts and smoothies worth slowing down for.</p>
        <a href="#menu" onClick={handleLink("#menu")}>
          Discover our menu ↗
        </a>
      </div>
    </section>
  );
}
