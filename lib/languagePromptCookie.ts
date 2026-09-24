// Functional cookie that remembers a customer has already seen the Menu's
// first-visit language prompt. Deliberately separate from the actual
// selected-language preference, which stays in localStorage under
// "pressd-menu-language" (see lib/i18n/LocaleContext.tsx) and is untouched
// by this file — this cookie only gates whether the prompt modal reappears.
export const LANGUAGE_PROMPT_COOKIE_NAME = "pressd-language-prompt";
export const LANGUAGE_PROMPT_COOKIE_VALUE = "completed";
export const LANGUAGE_PROMPT_COOKIE_DAYS = 30;

export function hasLanguagePromptCookie(): boolean {
  if (typeof document === "undefined") return true;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + LANGUAGE_PROMPT_COOKIE_NAME + "=([^;]*)")
  );
  return match ? match[1] === LANGUAGE_PROMPT_COOKIE_VALUE : false;
}

export function setLanguagePromptCookie(): void {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = LANGUAGE_PROMPT_COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${LANGUAGE_PROMPT_COOKIE_NAME}=${LANGUAGE_PROMPT_COOKIE_VALUE}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
}
