import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  PhoneCall,
  Code2,
  Briefcase,
  CheckCircle2,
  X,
  Globe2,
  Building2,
  Layers,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import JobCard from "@/components/JobCard";
import { listJobs } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

const PAGE_SIZE = 10;

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildPaginationItems(page: number, totalPages: number) {
  if (totalPages <= 1) return [];
  const p = clamp(page, 1, totalPages);

  const items: Array<number | "..."> = [];
  const push = (v: number | "...") => items.push(v);

  push(1);

  const left = Math.max(2, p - 1);
  const right = Math.min(totalPages - 1, p + 1);

  if (left > 2) push("...");
  for (let i = left; i <= right; i++) push(i);
  if (right < totalPages - 1) push("...");
  if (totalPages > 1) push(totalPages);

  const cleaned: Array<number | "..."> = [];
  for (const it of items) {
    const last = cleaned[cleaned.length - 1];
    if (it === "..." && last === "...") continue;
    if (typeof it === "number" && typeof last === "number" && it === last) continue;
    cleaned.push(it);
  }
  return cleaned;
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const { t } = useTranslation();
  const items = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t("jobs.pagination.prev")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        {items.map((it, idx) => {
          if (it === "...") {
            return (
              <span key={`dots-${idx}`} className="px-2 text-sm text-slate-500">
                …
              </span>
            );
          }
          const active = it === page;
          return (
            <button
              key={it}
              type="button"
              className={cn(
                "h-9 min-w-[38px] rounded-xl border px-3 text-sm font-semibold transition",
                active
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
              onClick={() => onChange(it)}
              aria-label={t("jobs.pagination.goTo", { page: it })}
            >
              {it}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t("jobs.pagination.next")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

type FilterOptions = {
  countries: string[];
  departments: string[];
  levels: string[];
};

function normalizeOpt(v: any) {
  return String(v ?? "").trim();
}

function SelectPill({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-white/90">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/25 bg-white/10">
          {icon}
        </span>
        {label}
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none",
            "rounded-2xl border-2 border-white/25",
            "bg-white/10 backdrop-blur-sm",
            "px-4 py-3 pr-10",
            "text-sm font-semibold text-white",
            "focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-200/30",
            "cursor-pointer min-h-[48px]"
          )}
          style={{
            color: 'white',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
          }}
        >
          <option value="ALL" style={{ backgroundColor: '#1e293b', color: 'white' }}>
            {t("common.all")}
          </option>
          {options.map((o) => (
            <option key={o} value={o} style={{ backgroundColor: '#1e293b', color: 'white' }}>
              {o}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown className="h-5 w-5 text-white/70" />
        </div>
      </div>
    </div>
  );
}

type Step = {
  n: number;
  icon: ReactNode;
  frontTitle: string;
  frontDesc: string;
  bullets: string[];
  backTitle: string;
  backDesc: string;
};

function HiringProcessCards() {
  const { t } = useTranslation();
  const steps: Step[] = useMemo(
    () => [
      {
        n: 1,
        icon: <Sparkles className="h-5 w-5" />,
        frontTitle: t("jobs.hiring.steps.1.frontTitle"),
        frontDesc: t("jobs.hiring.steps.1.frontDesc"),
        bullets: t("jobs.hiring.steps.1.bullets", { returnObjects: true }) as string[],
        backTitle: t("jobs.hiring.steps.1.backTitle"),
        backDesc: t("jobs.hiring.steps.1.backDesc"),
      },
      {
        n: 2,
        icon: <FileText className="h-5 w-5" />,
        frontTitle: t("jobs.hiring.steps.2.frontTitle"),
        frontDesc: t("jobs.hiring.steps.2.frontDesc"),
        bullets: t("jobs.hiring.steps.2.bullets", { returnObjects: true }) as string[],
        backTitle: t("jobs.hiring.steps.2.backTitle"),
        backDesc: t("jobs.hiring.steps.2.backDesc"),
      },
      {
        n: 3,
        icon: <PhoneCall className="h-5 w-5" />,
        frontTitle: t("jobs.hiring.steps.3.frontTitle"),
        frontDesc: t("jobs.hiring.steps.3.frontDesc"),
        bullets: t("jobs.hiring.steps.3.bullets", { returnObjects: true }) as string[],
        backTitle: t("jobs.hiring.steps.3.backTitle"),
        backDesc: t("jobs.hiring.steps.3.backDesc"),
      },
      {
        n: 4,
        icon: <Code2 className="h-5 w-5" />,
        frontTitle: t("jobs.hiring.steps.4.frontTitle"),
        frontDesc: t("jobs.hiring.steps.4.frontDesc"),
        bullets: t("jobs.hiring.steps.4.bullets", { returnObjects: true }) as string[],
        backTitle: t("jobs.hiring.steps.4.backTitle"),
        backDesc: t("jobs.hiring.steps.4.backDesc"),
      },
      {
        n: 5,
        icon: <Briefcase className="h-5 w-5" />,
        frontTitle: t("jobs.hiring.steps.5.frontTitle"),
        frontDesc: t("jobs.hiring.steps.5.frontDesc"),
        bullets: t("jobs.hiring.steps.5.bullets", { returnObjects: true }) as string[],
        backTitle: t("jobs.hiring.steps.5.backTitle"),
        backDesc: t("jobs.hiring.steps.5.backDesc"),
      },
    ],
    [t]
  );

  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">{t("jobs.hiring.title")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("jobs.hiring.subtitle")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {steps.map((s) => {
          const isOpen = open === s.n;

          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setOpen((p) => (p === s.n ? null : s.n))}
              className="group relative text-left"
              aria-label={t("jobs.hiring.ariaStep", { n: s.n })}
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60">
                <div
                  className={cn(
                    "absolute inset-0 p-5 transition duration-300",
                    "md:group-hover:opacity-0 md:group-hover:translate-y-2 md:group-hover:pointer-events-none",
                    isOpen ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                        {s.icon}
                      </span>
                      {t("jobs.hiring.stepLabel", { n: s.n })}
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 md:hidden" />
                  </div>

                  <div className="mt-4">
                    <div className="text-base font-black leading-snug text-slate-900">{s.frontTitle}</div>
                    <div className="mt-1 text-sm text-slate-600">{s.frontDesc}</div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {s.bullets.slice(0, 3).map((b) => (
                      <div key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span className="leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-xs font-semibold text-slate-500">{t("jobs.hiring.hoverHint")}</div>
                </div>

                <div
                  className={cn(
                    "absolute inset-0 p-5 transition duration-300",
                    "opacity-0 -translate-y-2 pointer-events-none",
                    "md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto",
                    isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "md:opacity-0 md:-translate-y-2"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                      {t("jobs.hiring.detail")}
                    </div>
                    <ChevronUp className="h-4 w-4 text-orange-400 md:hidden" />
                  </div>

                  <div className="mt-4 h-[210px] overflow-auto pr-1">
                    <div className="text-base font-black leading-snug text-slate-900">{s.backTitle}</div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-700">{s.backDesc}</div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="text-xs font-bold text-slate-600">{t("jobs.hiring.tip")}</div>
                      <div className="mt-1 leading-relaxed">{s.bullets?.[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-center text-xs text-slate-500">{t("jobs.hiring.footerNote")}</div>
    </div>
  );
}

type FaqItem = { q: string; a: string };

function FaqTabs() {
  const { t } = useTranslation();

  const tabs = useMemo(
    () =>
      [
        { key: "fulltime", label: t("jobs.faq.tabs.fulltime") },
        { key: "internship", label: t("jobs.faq.tabs.internship") },
        { key: "tech", label: t("jobs.faq.tabs.tech") },
      ] as const,
    [t]
  );

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("fulltime");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const fulltime = t("jobs.faq.data.fulltime", { returnObjects: true }) as FaqItem[];
  const internship = t("jobs.faq.data.internship", { returnObjects: true }) as FaqItem[];
  const tech = t("jobs.faq.data.tech", { returnObjects: true }) as FaqItem[];

  const data = tab === "fulltime" ? fulltime : tab === "internship" ? internship : tech;

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">{t("jobs.faq.title")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("jobs.faq.subtitle")}</p>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                type="button"
                onClick={() => {
                  setTab(tb.key);
                  setOpenIdx(0);
                }}
                className={cn(
                  "rounded-xl px-5 py-2 text-sm font-semibold transition",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {data.map((it, idx) => {
          const open = openIdx === idx;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpenIdx((p) => (p === idx ? null : idx))}
                aria-expanded={open}
                aria-controls={`faq-${tab}-${idx}`}
              >
                <div className="text-sm font-semibold text-slate-900">{it.q}</div>
                <div className="mt-0.5 shrink-0 text-slate-500">
                  {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {open && (
                <div id={`faq-${tab}-${idx}`} className="border-t border-slate-100 px-5 py-4">
                  <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{it.a}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const q = sp.get("q") ?? "";
  const country = sp.get("country") ?? "ALL";
  const department = sp.get("department") ?? "ALL";
  const level = sp.get("level") ?? "ALL";
  const pageParam = Number(sp.get("page") || "1") || 1;

  const [qDraft, setQDraft] = useState(q);
  const qDebounceRef = useRef<number | null>(null);

  const [heroHover, setHeroHover] = useState(false);

  const title = useMemo(() => `${t("nav.jobs")} • SHD Careers`, [t]);

  function updateParams(next: Record<string, string>) {
    const merged = new URLSearchParams(sp);
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "ALL") merged.delete(k);
      else merged.set(k, v);
    });
    setSp(merged, { replace: true });
  }

  useEffect(() => {
    setQDraft(q);
  }, [q, lang]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    listJobs({ lang, q, country, department, level })
      .then((r: any) => {
        if (!alive) return;
        const list = Array.isArray(r?.jobs) ? (r.jobs as Job[]) : [];
        const totalCount = Number(r?.total ?? list.length) || list.length;
        setJobs(list);
        setTotal(totalCount);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? t("common.error"));
        setJobs([]);
        setTotal(0);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [lang, q, country, department, level, t]);

  const filterOptions: FilterOptions = useMemo(() => {
    const uniq = (xs: string[]) =>
      Array.from(new Set(xs.map((x) => normalizeOpt(x)).filter((x) => x && x !== "null" && x !== "undefined")));

    const countries = uniq(jobs.map((j: any) => j?.country)).sort((a, b) => a.localeCompare(b));
    const departments = uniq(jobs.map((j: any) => j?.department)).sort((a, b) => a.localeCompare(b));
    const levels = uniq(jobs.map((j: any) => j?.level)).sort((a, b) => a.localeCompare(b));

    return { countries, departments, levels };
  }, [jobs]);

  const totalCount = useMemo(() => (total > 0 ? total : jobs.length), [total, jobs.length]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const page = useMemo(() => clamp(pageParam, 1, totalPages), [pageParam, totalPages]);

  const pagedJobs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return jobs.slice(start, start + PAGE_SIZE);
  }, [jobs, page]);

  useEffect(() => {
    if (pageParam !== page) {
      const merged = new URLSearchParams(sp);
      if (page <= 1) merged.delete("page");
      else merged.set("page", String(page));
      setSp(merged, { replace: true });
    }
  }, [page, pageParam, totalPages, sp, setSp]);

  const listTopRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listTopRef.current) return;
    const y = listTopRef.current.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    if (qDraft === q) return;
    if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    qDebounceRef.current = window.setTimeout(() => {
      updateParams({ q: qDraft, page: "1" });
    }, 250);
    return () => {
      if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    };
  }, [qDraft, q]);

  function onChangePage(p: number) {
    const next = clamp(p, 1, totalPages);
    updateParams({ page: next <= 1 ? "" : String(next) });
  }

  function clearAllFilters() {
    updateParams({ country: "ALL", department: "ALL", level: "ALL", page: "1" });
  }

  const hasAnyFilter = (country && country !== "ALL") || (department && department !== "ALL") || (level && level !== "ALL");

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <section className="bg-white">
        {/* ✅ HERO - แบบใหม่ทั้งหมด: แยก layer ชัดเจน 100% */}
        <div className="relative overflow-hidden border-b border-slate-200">
          {/* 
            Background Layer (z-0) 
            - อยู่ด้านหลังสุด
            - ทุก element ภายใน = pointer-events: none
            - ไม่รับ click events ใดๆ เลย
          */}
          <div 
            className="absolute inset-0 select-none"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ 
                backgroundImage: `url(/images/jobs-hero.jpg)`,
                pointerEvents: 'none'
              }}
            />
            <div
              className={cn(
                "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
                heroHover ? "opacity-100" : "opacity-0"
              )}
              style={{ 
                backgroundImage: `url(/images/jobs-hero-hover.jpg)`,
                pointerEvents: 'none'
              }}
            />
            <div 
              className="absolute inset-0 bg-[radial-gradient(62%_58%_at_18%_18%,rgba(0,0,0,0.38),transparent_62%)]"
              style={{ pointerEvents: 'none' }}
            />
            <div 
              className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-white/0 to-white"
              style={{ pointerEvents: 'none' }}
            />
          </div>

          {/* 
            Content Layer (relative, no z-index) 
            - ทุก interactive element อยู่ layer นี้
            - pointer-events: auto (default)
          */}
          <div 
            className="relative"
            onMouseEnter={() => setHeroHover(true)}
            onMouseLeave={() => setHeroHover(false)}
          >
            <div className="mx-auto w-full max-w-[1280px] px-4 pt-24 pb-12 md:pt-28 md:pb-16">
              {/* Text Content - ไม่ต้องคลิก */}
              <div className="w-full max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{t("jobs.hero.badge")}</span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                  <span className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">{t("jobs.hero.title")}</span>
                </h1>

                <p className="mt-2 text-sm text-white/90 md:text-base">
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{t("jobs.hero.subtitle")}</span>
                </p>
              </div>

              {/* Interactive Controls - คลิกได้ทั้งหมด */}
              <div className="mt-5 w-full">
                {/* Search & Buttons */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/80" />
                    <input
                      type="text"
                      className={cn(
                        "w-full rounded-2xl border-2 border-white/20 bg-white/10",
                        "px-11 py-3 text-sm font-semibold text-white placeholder:text-white/70",
                        "outline-none transition",
                        "focus:border-orange-200 focus:ring-2 focus:ring-orange-200/30"
                      )}
                      value={qDraft}
                      placeholder={t("jobs.hero.searchPlaceholder")}
                      onChange={(e) => setQDraft(e.target.value)}
                      aria-label={t("jobs.hero.searchAria")}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:justify-end">
                    <div className="rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white select-none">
                      {loading ? t("common.loading") : t("jobs.hero.openCount", { count: totalCount })}
                    </div>

                    {hasAnyFilter && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className={cn(
                          "inline-flex items-center justify-center gap-2",
                          "rounded-2xl border-2 border-white/20 bg-white/10",
                          "px-4 py-3 text-sm font-bold text-white",
                          "transition hover:bg-white/15 active:bg-white/20"
                        )}
                      >
                        <X className="h-4 w-4" />
                        {t("jobs.hero.clearFilters")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters - แยกออกมาเป็น row ของตัวเอง */}
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <SelectPill
                    label={t("jobs.filters.country")}
                    icon={<Globe2 className="h-4 w-4 text-white/90" />}
                    value={country}
                    options={filterOptions.countries}
                    onChange={(v) => updateParams({ country: v, page: "1" })}
                  />
                  <SelectPill
                    label={t("jobs.filters.department")}
                    icon={<Building2 className="h-4 w-4 text-white/90" />}
                    value={department}
                    options={filterOptions.departments}
                    onChange={(v) => updateParams({ department: v, page: "1" })}
                  />
                  <SelectPill
                    label={t("jobs.filters.level")}
                    icon={<Layers className="h-4 w-4 text-white/90" />}
                    value={level}
                    options={filterOptions.levels}
                    onChange={(v) => updateParams({ level: v, page: "1" })}
                  />
                </div>

                <div className="mt-3 text-xs font-semibold text-white/85">
                  {t("jobs.hero.tip")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="container-page py-10">
          <div ref={listTopRef} className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{t("jobs.list.title")}</h2>
                <div className="mt-1 text-sm text-slate-600">
                  {loading
                    ? t("common.loading")
                    : t("jobs.list.subtitle", { count: totalCount, perPage: PAGE_SIZE })}
                </div>
              </div>

              <div className="md:block">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  {t("jobs.list.pageLabel")} <span className="font-bold">{page}</span> / {totalPages}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            )}
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="text-sm text-slate-600">{t("common.loading")}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="card p-6 text-sm text-slate-600">{t("jobs.list.empty")}</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {pagedJobs.map((j) => (
                    <JobCard key={j.job_id} job={j} />
                  ))}
                </div>

                <Pagination page={page} totalPages={totalPages} onChange={onChangePage} />
              </>
            )}
          </div>

          <div className="mt-10">
            <HiringProcessCards />
          </div>

          <div className="mt-8">
            <FaqTabs />
          </div>
        </div>
      </section>
    </>
  );
}