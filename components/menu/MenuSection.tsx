"use client";

import { useEffect, useRef, useState } from "react";
import { menu } from "@/data/menu";
import CategoryFilter from "@/components/menu/CategoryFilter";
import ProductCard from "@/components/menu/ProductCard";
import ProductDetailsModal from "@/components/menu/ProductDetailsModal";
import InstructionsModal from "@/components/menu/InstructionsModal";
import CustomizeModal from "@/components/menu/CustomizeModal";
import { MenuModalsProvider } from "@/components/menu/MenuModalsContext";
import { columnId, columnsFor, revealInStrip } from "@/components/menu/menuHelpers";
import SectionHomeButton from "@/components/SectionHomeButton";
import RevealObserver from "@/components/RevealObserver";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { slugify } from "@/lib/slugify";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";

export default function MenuSection() {
  const { t, locale, dir } = useLocale();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const navHidden = useScrollDirection();

  // Scroll-down normally keeps the bars hidden, but briefly reveals them as a
  // "category checkpoint" when the user crosses into a new category while
  // still scrolling down — see the activeCategory effect below. Scroll-up
  // behavior (navHidden alone) is untouched.
  const [transitionPulse, setTransitionPulse] = useState(false);
  const pulsedCategoryRef = useRef<string | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Applied imperatively (not via the className prop) because SectionNavContext
  // adds/removes "active-detail" on this same <section> via raw DOM classList
  // manipulation, outside React's tracking. Driving this through className would
  // make React's reconciliation overwrite the whole class attribute on every
  // scroll-triggered toggle, silently wiping out "active-detail" and breaking
  // the menu scroll-fix CSS that depends on it.
  useEffect(() => {
    sectionRef.current?.classList.toggle("menu-nav-hidden", navHidden && !transitionPulse);
  }, [navHidden, transitionPulse]);

  // One-shot "checkpoint" pulse: the first time activeCategory changes to a
  // category we haven't already pulsed for, briefly force the bars visible
  // (even while navHidden is true from downward scrolling), then let them
  // settle back to whatever navHidden says. Skips the initial mount so the
  // page doesn't pulse on load, and dedupes per category so lingering near a
  // boundary can't repeatedly flicker it.
  useEffect(() => {
    if (pulsedCategoryRef.current === null) {
      pulsedCategoryRef.current = activeCategory;
      return;
    }
    if (pulsedCategoryRef.current === activeCategory) return;
    pulsedCategoryRef.current = activeCategory;

    clearTimeout(pulseTimeoutRef.current);
    setTransitionPulse(true);
    pulseTimeoutRef.current = setTimeout(() => setTransitionPulse(false), 1400);
  }, [activeCategory]);

  useEffect(() => () => clearTimeout(pulseTimeoutRef.current), []);

  const selectCategory = (slug: string) => {
    if (slug === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveCategory("all");
      return;
    }
    const target = document.getElementById(slug);
    setActiveCategory(slug);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Keep the active category button in sync while the customer scrolls the menu.
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>(".menu-category")];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory((entry.target as HTMLElement).dataset.category || menu[0].slug);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Keep active subcategory in sync while scrolling through menu subsections
  useEffect(() => {
    const subsections = [...document.querySelectorAll<HTMLElement>(".menu-subsection")];
    if (!subsections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSubcategory(entry.target.id);
          }
        });
      },
      { rootMargin: "-25% 0px -55%", threshold: 0 }
    );

    subsections.forEach((sub) => observer.observe(sub));
    return () => observer.disconnect();
  }, []);

  // Keep the active subsection's button in view in its own sub-navigation.
  useEffect(() => {
    if (!activeSubcategory) return;
    const button = document.querySelector<HTMLElement>(
      `.menu-subnav button[data-subtarget="${CSS.escape(activeSubcategory)}"]`
    );
    const strip = button?.closest<HTMLElement>(".menu-subnav");
    if (button && strip) revealInStrip(strip, button);
  }, [activeSubcategory]);

  return (
    <MenuModalsProvider>
      <section
        className="menu-section"
        id="menu"
        lang={locale}
        dir={dir}
        ref={sectionRef}
      >
        <div className="menu-intro">
          <p className="eyebrow dark">{t("ui.eyebrow", "EAT · DRINK · REPEAT")}</p>
          <h2>{t("ui.menuHeading", "THE MENU.")}</h2>
          <p>
            {t(
              "ui.menuIntro",
              "Bright plates, bold flavours and coffee worth slowing down for. Browse it your way."
            )}
          </p>
        </div>
        <CategoryFilter categories={menu} active={activeCategory} onSelect={selectCategory} />
        <div className="menu-content" ref={contentRef}>
          {menu.map((category, categoryIndex) => {
            const columns = columnsFor(category);
            const hasActiveInThisCategory = columns.some(
              (col) => columnId(category, col) === activeSubcategory
            );
            const categoryName = t(`categories.${category.slug}`, category.category);
            return (
              <article
                className="menu-category active-menu-category"
                id={category.slug}
                data-category={category.slug}
                key={category.slug}
              >
                <header className="category-title">
                  <div>
                    <p>
                      {String(categoryIndex + 1).padStart(2, "0")} · {t("ui.menuLabel", "MENU")}
                    </p>
                    <h3>{categoryName}</h3>
                  </div>
                  <span>{t(`categoryTaglines.${category.slug}`, category.tagline)}</span>
                </header>
                {columns.length > 1 && (
                  <nav
                    className="menu-subnav"
                    aria-label={`${categoryName} ${t("ui.sectionsAriaSuffix", "sections")}`}
                  >
                    {columns.map((column, index) => {
                      const subId = columnId(category, column);
                      const isSubActive = hasActiveInThisCategory
                        ? subId === activeSubcategory
                        : index === 0;
                      return (
                        <button
                          key={column}
                          type="button"
                          className={isSubActive ? "active" : undefined}
                          data-subtarget={subId}
                          onClick={() => {
                            setActiveSubcategory(subId);
                            document
                              .getElementById(subId)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {t(`subcategories.${slugify(column)}`, column)}
                        </button>
                      );
                    })}
                  </nav>
                )}
                <div className="menu-subsections">
                  {columns.map((column, columnIndex) => (
                    <section
                      className="menu-subsection"
                      id={columnId(category, column)}
                      data-column={column}
                      key={column}
                    >
                      <header>
                        <span>{String(columnIndex + 1).padStart(2, "0")}</span>
                        <h4>{t(`subcategories.${slugify(column)}`, column)}</h4>
                      </header>
                      <div className="menu-grid">
                        {category.items
                          .filter((item) => item[6] === column)
                          .map((item) => (
                            <ProductCard category={category} item={item} key={item[7]} />
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <SectionHomeButton />
      </section>
      <ProductDetailsModal />
      <InstructionsModal />
      <CustomizeModal />
      <RevealObserver watch={activeCategory} />
    </MenuModalsProvider>
  );
}
