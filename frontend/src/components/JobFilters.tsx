import { cn } from "@/lib/cn";
import { COUNTRIES, DEPARTMENTS, LEVELS } from "@/lib/options";
import { useTranslation } from "react-i18next";

type Props = {
  country: string;
  department: string;
  level: string;
  onChange: (next: { country?: string; department?: string; level?: string }) => void;
};

export default function JobFilters({ country, department, level, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="card p-5">
      <div className="text-sm font-black">{t("jobs.filters")}</div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-500">{t("common.country")}</div>
        <select className="input mt-2" value={country} onChange={(e) => onChange({ country: e.target.value })}>
          <option value="ALL">{t("common.all")}</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold text-slate-500">{t("common.department")}</div>
        <div className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
          <label className={cn("flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 cursor-pointer", department === "ALL" && "bg-slate-50")}>
            <input
              type="radio"
              name="dept"
              checked={department === "ALL"}
              onChange={() => onChange({ department: "ALL" })}
            />
            <span className="text-sm">{t("common.all")}</span>
          </label>

          {DEPARTMENTS.map((d) => (
            <label
              key={d}
              className={cn("flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 cursor-pointer", department === d && "bg-slate-50")}
            >
              <input type="radio" name="dept" checked={department === d} onChange={() => onChange({ department: d })} />
              <span className="text-sm text-slate-700">{d}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold text-slate-500">{t("common.level")}</div>
        <select className="input mt-2" value={level} onChange={(e) => onChange({ level: e.target.value })}>
          <option value="ALL">{t("common.all")}</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
