"use client";

import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";

export default function Footer() {
  const handleLink = useSectionLinkHandler();
  return (
    <footer>
      <div className="footer-top">
        <img className="footer-logo" src="/assets/pressd-footer-logo.png?v=2" alt="PRESS'D Wellness Café" />
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
        <span>INSTAGRAM · TIKTOK · FACEBOOK</span>
        <span>MEYDAN POLO RESIDENCE, DUBAI</span>
      </div>
    </footer>
  );
}
