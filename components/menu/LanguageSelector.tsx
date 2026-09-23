"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { LOCALES, localeMeta } from "@/lib/i18n/locales";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".language-trigger")?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moveFocus = (delta: 1 | -1, current: number) => {
    const options = listRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']");
    if (!options?.length) return;
    const next = (current + delta + options.length) % options.length;
    options[next]?.focus();
  };

  return (
    <div className="language-selector" ref={rootRef}>
      <button
        type="button"
        className="language-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("ui.languageButtonAria", "Change menu language")}
        onClick={() => setOpen((v) => !v)}
      >
        {localeMeta(locale).code === "zh-CN" ? "ZH" : locale.split("-")[0].toUpperCase()}
        <span aria-hidden="true" className={`language-caret${open ? " open" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="language-dropdown">
          <p className="language-dropdown-title">{t("ui.selectLanguage", "SELECT YOUR LANGUAGE")}</p>
          <ul role="listbox" aria-label={t("ui.selectLanguage", "SELECT YOUR LANGUAGE")} ref={listRef}>
            {LOCALES.map((item, index) => (
              <li key={item.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={item.code === locale}
                  className={item.code === locale ? "active" : undefined}
                  onClick={() => {
                    setLocale(item.code);
                    setOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveFocus(1, index);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveFocus(-1, index);
                    }
                  }}
                >
                  {item.code === locale && <span className="language-check" aria-hidden="true">✓</span>}
                  {item.nativeName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
