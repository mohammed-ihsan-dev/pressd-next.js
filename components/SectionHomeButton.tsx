"use client";

export default function SectionHomeButton() {
  return (
    <button
      className="section-home-button"
      type="button"
      aria-label="Scroll to top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
