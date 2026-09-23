export interface LocaleMeta {
  code: string;
  englishName: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", englishName: "English", nativeName: "English", dir: "ltr" },
  { code: "it", englishName: "Italian", nativeName: "Italiano", dir: "ltr" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "zh-CN", englishName: "Chinese", nativeName: "中文", dir: "ltr" },
  { code: "fr", englishName: "French", nativeName: "Français", dir: "ltr" },
  { code: "es-MX", englishName: "Spanish (Mexico)", nativeName: "Español (México)", dir: "ltr" },
  { code: "ko", englishName: "Korean", nativeName: "한국어", dir: "ltr" },
  { code: "tr", englishName: "Turkish", nativeName: "Türkçe", dir: "ltr" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "ru", englishName: "Russian", nativeName: "Русский", dir: "ltr" },
  { code: "ml", englishName: "Malayalam", nativeName: "മലയാളം", dir: "ltr" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isSupportedLocale(value: string | null | undefined): value is string {
  return !!value && LOCALE_CODES.includes(value);
}

export function localeMeta(code: string): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
