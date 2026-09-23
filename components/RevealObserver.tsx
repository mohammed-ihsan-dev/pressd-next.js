"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Faithful port of the original revealObserver: any element matching
 * .reveal, .menu-card, .category-title or .editorial gets `.visible` added
 * the first time it scrolls into view, then is unobserved.
 * Runs once per full section render, so it's re-invoked when the SPA
 * switches between home and a detail section.
 */
export default function RevealObserver({ watch }: { watch?: unknown }) {
  useEffect(() => {
    if (prefersReducedMotion()) {
      document.querySelectorAll(".reveal,.menu-card,.category-title,.editorial").forEach((el) =>
        el.classList.add("visible")
      );
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.13 }
    );
    document
      .querySelectorAll(".reveal,.menu-card,.category-title,.editorial")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [watch]);

  return null;
}
