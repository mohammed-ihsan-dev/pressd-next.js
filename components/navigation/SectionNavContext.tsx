"use client";

// Faithful port of the original script.js SPA section-switching behaviour:
// clicking a nav/hero-rail link doesn't navigate to a new page — it hides
// every other <section> and reveals the target one (body.detail-view),
// exactly like the live site. There is only ever one real route (`/`).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { prefersReducedMotion } from "@/lib/utils";

interface SectionNavValue {
  activeSection: string | null;
  isDetailView: boolean;
  openSection: (id: string, event?: { preventDefault: () => void }) => void;
  openHome: () => void;
}

const SectionNavContext = createContext<SectionNavValue | null>(null);

export function SectionNavProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const openSection = useCallback((id: string, event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    setActiveSection(id);
  }, []);

  const openHome = useCallback(() => {
    setActiveSection(null);
  }, []);

  useEffect(() => {
    const body = document.body;
    const isDetail = activeSection !== null;
    body.classList.toggle("home-view", !isDetail);
    body.classList.toggle("detail-view", isDetail);
    body.classList.toggle("menu-detail-view", activeSection === "menu");

    document.querySelectorAll<HTMLElement>("main > section.active-detail").forEach((section) => {
      section.classList.remove("active-detail");
    });
    if (isDetail) {
      document.getElementById(activeSection!)?.classList.add("active-detail");
    }

    const reduced = prefersReducedMotion();
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      const target = isDetail ? document.getElementById(activeSection!) : null;
      if (target) target.scrollTop = 0;
    });
    const hash = isDetail ? `#${activeSection}` : "#home";
    if (location.hash !== hash) history.replaceState(null, "", hash);
    void reduced;
  }, [activeSection]);

  const value = useMemo(
    () => ({ activeSection, isDetailView: activeSection !== null, openSection, openHome }),
    [activeSection, openSection, openHome]
  );

  return <SectionNavContext.Provider value={value}>{children}</SectionNavContext.Provider>;
}

export function useSectionNav() {
  const ctx = useContext(SectionNavContext);
  if (!ctx) throw new Error("useSectionNav must be used within SectionNavProvider");
  return ctx;
}

/** Anchor-link click handler: internal `#id` links open the SPA section, everything else behaves normally. */
export function useSectionLinkHandler() {
  const { openSection, openHome } = useSectionNav();
  return useCallback(
    (href: string) => (event: React.MouseEvent) => {
      if (!href.startsWith("#")) return;
      const id = href.slice(1);
      if (id === "home") {
        event.preventDefault();
        openHome();
        return;
      }
      if (document.getElementById(id)) {
        openSection(id, event);
      }
    },
    [openSection, openHome]
  );
}
