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
  loadContentOverrides(lng);
});

// ---------------------------------------------------------------
// ✅ CMS overrides: ดึงข้อความที่แอดมินแก้จาก backend แล้ว merge ทับ default
//    (best-effort — ถ้า API ไม่พร้อม เว็บใช้ข้อความ default ตามปกติ)
// ---------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;
const loadedOverrides = new Set<string>();

// แปลง dot-key ({"a.b.c": "x"}) -> nested ({a:{b:{c:"x"}}})
function unflatten(flat: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] && typeof node[parts[i]] === "object" ? node[parts[i]] : {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = v;
  }
  return out;
}

export async function loadContentOverrides(lng: string): Promise<void> {
  if (!API_BASE || loadedOverrides.has(lng)) return;
  loadedOverrides.add(lng);
  try {
    const res = await fetch(`${API_BASE}/content?lang=${encodeURIComponent(lng)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return;
    const data = await res.json();
    const items = data?.items;
    if (items && typeof items === "object" && Object.keys(items).length) {
      i18n.addResourceBundle(lng, "translation", unflatten(items), true, true);
      i18n.emit("languageChanged", i18n.language); // re-render
    }
  } catch {
    /* ignore — ใช้ default */
  }
}

// โหลด override ของภาษาปัจจุบันตอนเริ่ม
loadContentOverrides(i18n.language);

export default i18n;
