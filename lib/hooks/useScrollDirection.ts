"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the page has been scrolled down meaningfully since the
 * last direction change, ignoring sub-threshold jitter. Returns true once
 * the user scrolls down past `threshold`, false on scroll-up or near top.
 */
export function useScrollDirection(threshold = 8, topOffset = 120) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (currentY < topOffset) {
        setHidden(false);
        lastY = currentY;
      } else if (delta > threshold) {
        setHidden(true);
        lastY = currentY;
      } else if (delta < -threshold) {
        setHidden(false);
        lastY = currentY;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return hidden;
}
