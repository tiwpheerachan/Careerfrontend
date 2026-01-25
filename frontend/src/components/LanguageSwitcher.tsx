import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Language } from "@/lib/types";

const LANGS: { code: Language; label: string }[] = [
  { code: "th", label: "ภาษาไทย" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only">Language</label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-soft">
        <Globe className="h-4 w-4 text-slate-600" />
        <select
          className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
          value={i18n.language as Language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
