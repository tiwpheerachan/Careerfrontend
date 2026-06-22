import React from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";

/** โลโก้/แบรนด์ SHDcareers (ใช้ใน sidebar + login) */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30">
        <Briefcase className="h-[18px] w-[18px]" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-black tracking-tight text-gray-900">
            SHD<span className="text-blue-600">careers</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Admin Console
          </div>
        </div>
      )}
    </div>
  );
}

/** หัวหน้าเพจมาตรฐาน: ไอคอน + ชื่อ + คำอธิบาย + ปุ่ม action */
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/60",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/60",
  red: "bg-red-50 text-red-700 ring-red-200/60",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  gray: "bg-gray-100 text-gray-600 ring-gray-200/60",
};

/** ป้ายสถานะแบบมี ring บางๆ */
export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: keyof typeof TONES | string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[tone] || TONES.gray,
        className
      )}
    >
      {children}
    </span>
  );
}

/** สถานะใบสมัคร -> สี */
export const APP_TONE: Record<string, string> = {
  new: "blue",
  reviewing: "amber",
  shortlisted: "violet",
  rejected: "red",
  hired: "emerald",
};

/** สถานะงาน -> สี */
export const JOB_TONE: Record<string, string> = {
  published: "emerald",
  draft: "amber",
  closed: "gray",
};

/** การ์ดครอบ section ของ dashboard */
export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const BAR_COLORS = ["bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-cyan-500"];

/** กราฟแท่งแนวนอน (อันดับ) */
export function BarList({
  items,
  emptyText = "ยังไม่มีข้อมูล",
}: {
  items: { label: string; value: number; sublabel?: string; href?: string }[];
  emptyText?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>;
  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const pct = Math.round((it.value / max) * 100);
        const inner = (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-700">{it.label}</span>
              <span className="shrink-0 text-sm font-bold text-gray-900">{it.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className={cn("h-full rounded-full", BAR_COLORS[idx % BAR_COLORS.length])} style={{ width: `${pct}%` }} />
            </div>
            {it.sublabel && <div className="mt-0.5 text-[11px] text-gray-400">{it.sublabel}</div>}
          </>
        );
        return it.href ? (
          <a key={idx} href={it.href} className="block rounded-lg p-1 -m-1 transition hover:bg-gray-50">{inner}</a>
        ) : (
          <div key={idx}>{inner}</div>
        );
      })}
    </div>
  );
}

/** กราฟแท่งเล็ก (เทรนด์รายวัน) */
export function Sparkbars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 96 }}>
      {data.map((d) => {
        const h = d.count === 0 ? 3 : Math.max(6, Math.round((d.count / max) * 96));
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.count}`}
            className={cn(
              "flex-1 rounded-t transition-colors",
              d.count > 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-200"
            )}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}
