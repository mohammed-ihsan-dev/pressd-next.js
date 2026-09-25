"use client";

import { useEffect, useRef } from "react";
import { useLocale, LOCALES } from "@/lib/i18n/LocaleContext";
import { useSectionNav } from "@/components/navigation/SectionNavContext";
import { hasLanguagePromptCookie, setLanguagePromptCookie } from "@/lib/languagePromptCookie";

export default function LanguagePromptModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { locale, setLocale, dir } = useLocale();
  const { activeSection } = useSectionNav();

  // The modal MUST ONLY show when the user is actively viewing the Menu section (#menu)
  const isMenuSection = activeSection === "menu";
  const shouldShow = isMenuSection && !hasLanguagePromptCookie();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (shouldShow) {
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
  }, [shouldShow]);

  // Completely unmount the dialog if we are NOT on the Menu section (#menu).
  // This guarantees the modal will NEVER appear on #home or any other page.
  if (!isMenuSection) {
    return null;
  }

  const handleSelectLanguage = (code: string) => {
    setLocale(code);
    setLanguagePromptCookie();
    dialogRef.current?.close();
  };

  const handleClose = () => {
    setLanguagePromptCookie();
    dialogRef.current?.close();
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


