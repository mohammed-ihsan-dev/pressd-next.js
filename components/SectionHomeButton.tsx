"use client";

import { useSectionNav } from "@/components/navigation/SectionNavContext";

export default function SectionHomeButton() {
  const { openHome } = useSectionNav();
  return (
    <button
      className="section-home-button"
      type="button"
      aria-label="Go back to home"
      onClick={() => {
        openHome();
        history.replaceState(null, "", "#home");
      }}
    >
      <span aria-hidden="true">⌂</span>
    </button>
  );
}
