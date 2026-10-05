"use client";

import { useSectionNav } from "@/components/navigation/SectionNavContext";

export default function SectionHomeButton() {
  const { openHome } = useSectionNav();

  return (
    <button
      className="section-home-button"
      type="button"
      aria-label="Back to home"
      title="Back to home"
      onClick={() => {
        openHome();
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9.5L12 2.5L21 9.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" />
      </svg>
    </button>
  );
}
