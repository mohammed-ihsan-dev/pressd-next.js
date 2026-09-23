"use client";

import { useEffect, useState } from "react";
import { useSectionNav } from "@/components/navigation/SectionNavContext";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { openHome } = useSectionNav();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`back-to-top${visible ? " visible" : ""}`}
      aria-label="Back to top"
      onClick={() => {
        openHome();
        history.replaceState(null, "", "#home");
      }}
    >
      ↑
    </button>
  );
}
