import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import th from "./locales/th/common.json";
import en from "./locales/en/common.json";
import zh from "./locales/zh/common.json";

const STORAGE_KEY = "shd_lang";

function detectLang(): "th" | "en" | "zh" {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "th" || saved === "en" || saved === "zh") return saved;

  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("th")) return "th";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    th: { translation: th },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLang(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
