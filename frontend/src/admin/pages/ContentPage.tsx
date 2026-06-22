import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Save, RotateCcw, CheckCircle2, FileText } from "lucide-react";
import { adminApi } from "../lib/adminApi";
import { PageHeader } from "../ui";
import thJson from "@/i18n/locales/th/common.json";
import enJson from "@/i18n/locales/en/common.json";
import zhJson from "@/i18n/locales/zh/common.json";

const LANGS = [
  { key: "th", label: "ไทย", json: thJson },
  { key: "en", label: "English", json: enJson },
  { key: "zh", label: "中文", json: zhJson },
] as const;

// flatten เฉพาะ string leaves -> { "nav.about": "About", ... }
function flattenStrings(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj == null) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flattenStrings(v, key));
    // array/object ที่ซับซ้อน (เช่น bullets, partners.list) ข้ามใน v1
  }
  return out;
}

export default function ContentPage() {
  const [lang, setLang] = useState<(typeof LANGS)[number]["key"]>("th");
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => {
    const json = LANGS.find((l) => l.key === lang)!.json;
    return flattenStrings(json);
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    setEdited({});
    setError(null);
    adminApi
      .listContent(lang)
      .then((res) => setOverrides(res.items || {}))
      .catch((e) => setError(e.message || "โหลดเนื้อหาไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [lang]);

  const keys = useMemo(() => {
    const all = Object.keys(defaults);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (k) => k.toLowerCase().includes(q) || String(defaults[k]).toLowerCase().includes(q)
    );
  }, [defaults, search]);

  const currentValue = (k: string): string => {
    if (k in edited) return edited[k];
    if (k in overrides && typeof overrides[k] === "string") return overrides[k];
    return defaults[k] ?? "";
  };
  const storedValue = (k: string): string =>
    k in overrides && typeof overrides[k] === "string" ? overrides[k] : defaults[k] ?? "";
  const isDirty = (k: string): boolean => k in edited && edited[k] !== storedValue(k);
  const isOverridden = (k: string): boolean => k in overrides;

  const onSave = async (k: string) => {
    setSavingKey(k);
    setError(null);
    try {
      await adminApi.saveContent(k, lang, edited[k]);
      setOverrides((o) => ({ ...o, [k]: edited[k] }));
      setEdited((e) => {
        const n = { ...e };
        delete n[k];
        return n;
      });
      setSavedKey(k);
      setTimeout(() => setSavedKey(null), 1500);
    } catch (e: any) {
      setError(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSavingKey(null);
    }
  };

  const onRevert = async (k: string) => {
    setSavingKey(k);
    try {
      await adminApi.deleteContent(k, lang);
      setOverrides((o) => {
        const n = { ...o };
        delete n[k];
        return n;
      });
      setEdited((e) => {
        const n = { ...e };
        delete n[k];
        return n;
      });
    } catch (e: any) {
      setError(e.message || "คืนค่าเดิมไม่สำเร็จ");
    } finally {
      setSavingKey(null);
    }
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title="เนื้อหาเว็บ"
        subtitle={`แก้ข้อความบนหน้าเว็บได้ทุกจุด · แก้ทับไว้ ${overrideCount} รายการ`}
        actions={
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition ${
                  lang === l.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="sticky top-0 z-10 -mx-1 mb-3 bg-gray-50 px-1 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="ค้นหา key หรือข้อความ… (เช่น nav, about, hero)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : (
        <div className="space-y-2">
          <p className="muted text-xs">แสดง {keys.length} จาก {Object.keys(defaults).length} รายการ</p>
          {keys.map((k) => {
            const dirty = isDirty(k);
            const overridden = isOverridden(k);
            const multiline = (currentValue(k) || "").length > 60;
            return (
              <div key={k} className="card p-3">
                <div className="mb-1 flex items-center gap-2">
                  <code className="text-[11px] text-gray-400">{k}</code>
                  {overridden && (
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      แก้ไขแล้ว
                    </span>
                  )}
                </div>
                {multiline ? (
                  <textarea
                    className="input min-h-[70px] resize-y"
                    value={currentValue(k)}
                    onChange={(e) => setEdited((ed) => ({ ...ed, [k]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="input"
                    value={currentValue(k)}
                    onChange={(e) => setEdited((ed) => ({ ...ed, [k]: e.target.value }))}
                  />
                )}
                <div className="mt-2 flex items-center justify-end gap-2">
                  {overridden && (
                    <button
                      onClick={() => onRevert(k)}
                      disabled={savingKey === k}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                      title="คืนค่าข้อความเดิม"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> คืนค่าเดิม
                    </button>
                  )}
                  <button
                    onClick={() => onSave(k)}
                    disabled={!dirty || savingKey === k}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {savingKey === k ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : savedKey === k ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> บันทึกแล้ว</>
                    ) : (
                      <><Save className="h-3.5 w-3.5" /> บันทึก</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
