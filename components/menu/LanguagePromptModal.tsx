"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, LOCALES } from "@/lib/i18n/LocaleContext";
import { useSectionNav } from "@/components/navigation/SectionNavContext";
import { hasLanguagePromptCookie, setLanguagePromptCookie } from "@/lib/languagePromptCookie";

export default function LanguagePromptModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { locale, setLocale, dir } = useLocale();
  const { activeSection } = useSectionNav();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (activeSection === "menu" && !hasLanguagePromptCookie()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [activeSection]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute("open", "");
        }
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    setLocale(code);
    setLanguagePromptCookie();
    setIsOpen(false);
  };

  const handleClose = () => {
    setLanguagePromptCookie();
    setIsOpen(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className="language-prompt-modal"
      dir={dir}
      aria-labelledby="language-prompt-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      onClose={handleClose}
    >
      <p className="language-prompt-eyebrow">PRESS’D WELLNESS CAFÉ</p>
      <h2 id="language-prompt-title">Select Language</h2>
      <p className="language-prompt-subtitle">
        Choose your preferred language for browsing our menu.
      </p>
      <ul className="language-prompt-list">
        {LOCALES.map((loc) => {
          const isSelected = locale === loc.code;
          return (
            <li key={loc.code}>
              <button
                type="button"
                className={isSelected ? "active" : undefined}
                onClick={() => handleSelectLanguage(loc.code)}
              >
                <span style={{ flex: "1 1 auto" }}>
                  {loc.nativeName} {loc.nativeName !== loc.englishName ? `(${loc.englishName})` : ""}
                </span>
                {isSelected && <span className="language-check">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

