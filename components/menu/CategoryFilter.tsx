"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuCategory } from "@/data/menu";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function CategoryFilter({
  categories,
  active,
  onSelect,
}: {
  categories: MenuCategory[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  const { t } = useLocale();
  const stripRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const update = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setCanPrev(strip.scrollLeft >= 3);
      setCanNext(strip.scrollLeft < max - 3);
      setCanScroll(max > 3);
    };
    update();
    strip.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    return () => {
      strip.removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: direction * Math.max(180, strip.clientWidth * 0.68), behavior: "smooth" });
  };

  return (
    <div className={`category-wrap${canScroll ? " can-scroll" : ""}`}>
      <button
        className="category-arrow category-prev"
        type="button"
        aria-label={t("ui.categoryPrevAria", "Show previous menu categories")}
        disabled={!canPrev}
        onClick={() => move(-1)}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div
        className="categories"
        role="tablist"
        aria-label={t("ui.categoriesAriaLabel", "Menu categories")}
        ref={stripRef}
      >
        <button
          className={active === "all" ? "active" : undefined}
          data-filter="all"
          onClick={() => onSelect("all")}
        >
          {t("ui.categoriesAll", "All")}
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            className={active === category.slug ? "active" : undefined}
            data-filter={category.slug}
            onClick={() => onSelect(category.slug)}
          >
            {t(`categories.${category.slug}`, category.category)}
          </button>
        ))}
      </div>
      <button
        className="category-arrow category-next"
        type="button"
        aria-label={t("ui.categoryNextAria", "Show more menu categories")}
        disabled={!canNext}
        onClick={() => move(1)}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
