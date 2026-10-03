"use client";

import { useSectionLinkHandler, useSectionNav } from "@/components/navigation/SectionNavContext";

export default function Footer() {
  const handleLink = useSectionLinkHandler();
  // Outside the Menu the footer is dark, so it uses the light-on-dark navbar
  // logo; the Menu keeps its approved gold footer and logo.
  const { activeSection } = useSectionNav();
  const logoSrc = activeSection === "menu" ? "/assets/pressd-footer-logo.png?v=2" : "/assets/pressd-logo.webp";
  return (
    <footer>
      <div className="footer-top">
        <img className="footer-logo" src={logoSrc} alt="PRESS'D Wellness Café" />
        <div className="footer-links">
          <a href="#menu" onClick={handleLink("#menu")}>
            Menu
          </a>
          <a href="#about" onClick={handleLink("#about")}>
            About
          </a>
          <a href="#visit" onClick={handleLink("#visit")}>
            Visit
          </a>
          <a href="mailto:hello@pressd.cafe">Contact</a>
        </div>
      </div>
      <div className="footer-statement">COFFEE. FOOD. PEOPLE.</div>
      <div className="footer-bottom">
        <span>© 2026 PRESS’D WELLNESS CAFÉ</span>
        <span>
          <a href="https://www.instagram.com/pressd.cafe" target="_blank" rel="noopener noreferrer">
            INSTAGRAM
          </a>{" "}
          · TIKTOK · FACEBOOK
        </span>
        <span>MEYDAN POLO RESIDENCE, DUBAI</span>
      </div>
    </footer>
  );
}
