// frontend/src/pages/JobsPage.tsx
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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import JobCard from "@/components/JobCard";
import { listJobs } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

const PAGE_SIZE = 15;

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
  const items = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
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
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** ========= Inline JobFilters (ใช้ options จาก jobs จริง) ========= */
type FilterOptions = {
  countries: string[];
  departments: string[];
  levels: string[];
};

function normalizeOpt(v: any) {
  const s = String(v ?? "").trim();
  return s;
}

function JobFilters({
  country,
  department,
  level,
  options,
  onChange,
}: {
  country: string;
  department: string;
  level: string;
  options: FilterOptions;
  onChange: (next: { country?: string; department?: string; level?: string }) => void;
}) {
  // UI polish: sticky / mobile drawer-ish feel (แต่ยังอยู่ใน layout เดิม)
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasAny =
    (country && country !== "ALL") || (department && department !== "ALL") || (level && level !== "ALL");

  const DeptRadio = (
    <div className="mt-3">
      <div className="text-sm font-black text-slate-900">แผนก</div>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="max-h-[300px] overflow-auto pr-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 hover:bg-white">
            <input
              type="radio"
              name="department"
              checked={department === "ALL"}
              onChange={() => onChange({ department: "ALL" })}
              className="mt-1"
            />
            <div className="text-sm font-semibold text-slate-900">ทั้งหมด</div>
          </label>

          {options.departments.map((d) => (
            <label
              key={d}
              className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 hover:bg-white"
              title={d}
            >
              <input
                type="radio"
                name="department"
                checked={department === d}
                onChange={() => onChange({ department: d })}
                className="mt-1"
              />
              <div className="text-sm font-medium text-slate-800">{d}</div>
            </label>
          ))}

          {options.departments.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-600">ยังไม่มีข้อมูลแผนกจากประกาศงาน</div>
          )}
        </div>
      </div>
    </div>
  );

  const Body = (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black text-slate-900">ตัวกรอง</div>

        <div className="flex items-center gap-2">
          {hasAny && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => onChange({ country: "ALL", department: "ALL", level: "ALL" })}
            >
              <X className="h-4 w-4" />
              ล้างตัวกรอง
            </button>
          )}

          {/* mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            ปิด
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Country */}
        <div>
          <div className="text-sm font-black text-slate-900">ประเทศ</div>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-200 focus:ring-4 focus:ring-orange-200/30"
            value={country}
            onChange={(e) => onChange({ country: e.target.value })}
          >
            <option value="ALL">ทั้งหมด</option>
            {options.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {options.countries.length === 0 && <div className="mt-2 text-xs text-slate-500">—</div>}
        </div>

        {/* Dept (radio list) */}
        {DeptRadio}

        {/* Level */}
        <div>
          <div className="text-sm font-black text-slate-900">ระดับ</div>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-200 focus:ring-4 focus:ring-orange-200/30"
            value={level}
            onChange={(e) => onChange({ level: e.target.value })}
          >
            <option value="ALL">ทั้งหมด</option>
            {options.levels.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
          {options.levels.length === 0 && <div className="mt-2 text-xs text-slate-500">—</div>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{Body}</div>

      {/* Mobile compact trigger */}
      <div className="md:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
          onClick={() => setMobileOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            ตัวกรอง
            {hasAny && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">มี</span>}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl bg-white p-4">
              {Body}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** ========= Hiring Process (flip cards) ========= */
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
  const steps: Step[] = [
    {
      n: 1,
      icon: <Sparkles className="h-5 w-5" />,
      frontTitle: "ค้นพบโอกาสใหม่ ๆ",
      frontDesc: "หางานที่เหมาะกับความสามารถของคุณ",
      bullets: ["เลือกทีม/สายงานที่สนใจ", "อ่าน JD ให้เข้าใจ", "เช็คสถานที่/รูปแบบงาน"],
      backTitle: "ขั้นตอนที่ 1: เลือกตำแหน่ง",
      backDesc: "เริ่มจากการค้นหาตำแหน่งที่ตรงกับความสามารถ เป้าหมาย และรูปแบบการทำงานที่คุณต้องการ",
    },
    {
      n: 2,
      icon: <FileText className="h-5 w-5" />,
      frontTitle: "เตรียมประวัติการทำงานของคุณ",
      frontDesc: "อัปเดตให้ชัดเจนและตรงจุด",
      bullets: ["สรุป impact เป็นตัวเลข", "ใส่โปรเจคเด่น", "แนบลิงก์ผลงาน"],
      backTitle: "ขั้นตอนที่ 2: เตรียมเรซูเม่",
      backDesc: "เรซูเม่ที่ดีควรอ่านง่าย เห็นผลลัพธ์ชัด และมีข้อมูลที่เกี่ยวข้องกับตำแหน่งที่สมัคร",
    },
    {
      n: 3,
      icon: <PhoneCall className="h-5 w-5" />,
      frontTitle: "สัมภาษณ์ทางโทรศัพท์",
      frontDesc: "คุยภาพรวมและความสนใจ",
      bullets: ["เล่า background แบบกระชับ", "ชัดเจนเรื่องความสนใจ", "ถามขั้นตอนถัดไป"],
      backTitle: "ขั้นตอนที่ 3: Phone Interview",
      backDesc: "เจ้าหน้าที่สรรหาจะพูดคุยเพื่อทำความเข้าใจประสบการณ์ เป้าหมาย และความเหมาะสมกับบทบาท",
    },
    {
      n: 4,
      icon: <Code2 className="h-5 w-5" />,
      frontTitle: "ทดสอบ/สัมภาษณ์เชิงลึก",
      frontDesc: "ตามสายงานและระดับตำแหน่ง",
      bullets: ["เตรียม case / portfolio", "ฝึกตอบเชิงเหตุผล", "ทบทวน fundamentals"],
      backTitle: "ขั้นตอนที่ 4: Deep Interview",
      backDesc: "อาจมีแบบทดสอบหรือการสัมภาษณ์กับผู้จัดการทีม เพื่อประเมินทักษะเชิงลึกและวิธีคิด",
    },
    {
      n: 5,
      icon: <Briefcase className="h-5 w-5" />,
      frontTitle: "ยื่นข้อเสนอ",
      frontDesc: "สรุปรายละเอียดและเริ่มเส้นทางใหม่",
      bullets: ["ตรวจสอบรายละเอียดข้อเสนอ", "ยืนยันวันเริ่มงาน", "เตรียมเอกสาร"],
      backTitle: "ขั้นตอนที่ 5: Offer",
      backDesc: "เมื่อผ่านทุกขั้นตอน เราจะส่งข้อเสนอให้คุณ พร้อมรายละเอียดการเริ่มงานและเอกสารที่เกี่ยวข้อง",
    },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">กระบวนการว่าจ้างของเรา</h2>
        <p className="mt-2 text-sm text-slate-600">แตะ/เลื่อนเมาส์เพื่อดูรายละเอียดในแต่ละขั้นตอน</p>
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
              aria-label={`Step ${s.n}`}
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60">
                {/* FRONT */}
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
                      Step {s.n}
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

                  <div className="mt-4 text-xs font-semibold text-slate-500">เลื่อนเมาส์เพื่อดูรายละเอียด</div>
                </div>

                {/* BACK */}
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
                      รายละเอียด
                    </div>
                    <ChevronUp className="h-4 w-4 text-orange-400 md:hidden" />
                  </div>

                  {/* IMPORTANT: กันซ้อนทับ ด้วย overflow-auto + spacing */}
                  <div className="mt-4 h-[210px] overflow-auto pr-1">
                    <div className="text-base font-black leading-snug text-slate-900">{s.backTitle}</div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-700">{s.backDesc}</div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="text-xs font-bold text-slate-600">Tip</div>
                      <div className="mt-1 leading-relaxed">{s.bullets[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-center text-xs text-slate-500">
        * ขั้นตอนอาจแตกต่างกันตามตำแหน่งและความอาวุโสของบทบาท
      </div>
    </div>
  );
}

/** ========= FAQ ========= */
type FaqItem = { q: string; a: string };

function FaqTabs() {
  const tabs = [
    { key: "fulltime", label: "Full time" },
    { key: "internship", label: "Internship" },
    { key: "tech", label: "Tech" },
  ] as const;

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("fulltime");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const fulltime: FaqItem[] = [
    {
      q: "ฉันต้องการเพิ่มรายละเอียดเพิ่มเติมในเรซูเม่ของฉัน ฉันควรส่งใบสมัครอีกครั้งหรือไม่",
      a: "คุณสามารถส่งอีเมลถึงเจ้าหน้าที่สรรหาที่ติดต่อคุณเพื่อขอให้อัปเดตประวัติส่วนตัวของคุณ\n\nอย่างไรก็ตาม คุณสามารถส่งใบสมัครของคุณอีกครั้งพร้อมกับประวัติส่วนตัวที่อัปเดตแล้ว หากคุณเพิ่งส่งใบสมัครไปก่อนหน้านี้ไม่นาน",
    },
    {
      q: "ฉันสามารถสมัครงานมากกว่าหนึ่งตำแหน่งพร้อมกันได้หรือไม่",
      a: "ได้ คุณสามารถสมัครได้หลายตำแหน่ง แต่เจ้าหน้าที่สรรหาของเราจะนำเสนอตำแหน่งงานที่มีความเหมาะสมที่สุดให้กับคุณ!\n\nโปรดทราบว่า คุณสามารถสัมภาษณ์งานได้เพียงหนึ่งตำแหน่งในแต่ละครั้งเท่านั้น",
    },
    {
      q: "ฉันสามารถใช้สมัครตำแหน่งงานเดิมได้อีกหรือไม่ หากฉันไม่ได้รับการติดต่อก่อนหน้านี้",
      a: "ได้ หากตำแหน่งงานยังไม่ได้ผู้สมัคร คุณสามารถสมัครในตำแหน่งนั้นอีกครั้งได้\n\nอย่างไรก็ตาม เราแนะนำให้คุณเพิ่มทักษะให้กับตัวเองก่อนที่จะสมัครรับตำแหน่งเดิมอีกครั้ง",
    },
    {
      q: "ฉันจะรู้สถานะการสมัครของฉันได้อย่างไร",
      a: "เจ้าหน้าที่สรรหาของเราจะแจ้งสถานะการสมัครและขั้นตอนต่อไปของกระบวนการว่าจ้างให้คุณทราบทางอีเมล กรุณาเผื่อเวลาให้เราสำหรับการติดต่อกลับหาคุณ",
    },
    {
      q: "เจ้าหน้าที่สรรหามองหาอะไรในระหว่างการสัมภาษณ์ทางโทรศัพท์",
      a: "เจ้าหน้าที่สรรหาต้องการทราบเกี่ยวกับทักษะและประสบการณ์ของคุณ รวมทั้งความสนใจในการเข้าทำงานกับบริษัท และยังมองหาความกระตือรือร้นและความเหมาะสมของวัฒนธรรม\n\nดังนั้นจงเป็นตัวของตัวเอง! ที่สำคัญที่สุด แสดงความสนใจที่คุณมีเกี่ยวกับบริษัทด้วย",
    },
  ];

  const internship: FaqItem[] = [
    {
      q: "ฉันสนใจที่จะสมัครฝึกงาน แต่ฉันเพิ่งจบการศึกษาเมื่อไม่กี่เดือนที่ผ่านมา ฉันสามารถสมัครได้หรือไม่",
      a: "คุณได้รับการสนับสนุนให้มีบทบาทในการทำงานอย่างเต็มที่ เมื่อสำเร็จการศึกษาจะสามารถทำงานที่มีความหมายมากขึ้นและมีโอกาสในการเรียนรู้มากขึ้น",
    },
    {
      q: "ระยะเวลาการฝึกงานคือเมื่อใด และฉันควรเริ่มสมัครเมื่อใด",
      a: "เราจ้างนักศึกษาฝึกงานตลอดทั้งปี! ไม่จำกัดช่วงเวลาที่ในการสมัครฝึกงาน และคุณสามารถตรวจสอบตำแหน่งงานเพื่อดูโอกาสฝึกงานกับเราได้",
    },
    {
      q: "มีระยะเวลาการฝึกงานนานแค่ไหน ฉันสามารถกำหนดช่วงเวลาฝึกงานของฉันเองได้หรือไม่",
      a: "ระยะเวลาที่แนะนำของการฝึกงานอย่างน้อย 3 เดือน เพื่อให้คุณสามารถเรียนรู้โครงการที่มีความหมาย\n\nมีโอกาสในการการขยายระยะเวลาการฝึกงาน ซึ่งอาจจะได้รับอนุญาตภายใต้ความต้องการทางธุรกิจและหัวหน้างาน",
    },
  ];

  const tech: FaqItem[] = [
    {
      q: "ฉันต้องเรียนจบในสายวิทยาศาสตร์คอมพิวเตอร์หรือวิศวกรรมคอมพิวเตอร์ถึงจะสามารถสมัครงานในสายงานเทคโนโลยีได้หรือไม่",
      a: "ไม่ เราเปิดรับทุกสาขาวิชาสำหรับตำแหน่งสายงานเทคโนโลยี\n\nแต่อย่างไรก็ดี หากผู้สมัครจบสาขาวิทยาศาสตร์คอมพิวเตอร์ หรือวิศวกรรมคอมพิวเตอร์ จะได้รับการพิจารณาเป็นพิเศษ",
    },
    {
      q: "ฉันควรคาดหวังอะไรจากการสัมภาษณ์ทางเทคนิค",
      a: "เราจะมีการทดสอบทักษะของคุณ กรุณาเตรียมตัวสำหรับแบบทดสอบในเรื่องการเขียนโค้ด ทดสอบทางด้านตรรกะ และหัวข้อ CS fundamentals",
    },
  ];

  const data = tab === "fulltime" ? fulltime : tab === "internship" ? internship : tech;

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">คำถามที่พบบ่อย</h2>
        <p className="mt-2 text-sm text-slate-600">เลือกหมวด แล้วกดเพื่อเปิดคำตอบ</p>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setOpenIdx(0);
                }}
                className={cn(
                  "rounded-xl px-5 py-2 text-sm font-semibold transition",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {t.label}
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
              >
                <div className="text-sm font-semibold text-slate-900">{it.q}</div>
                <div className="mt-0.5 shrink-0 text-slate-500">
                  {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {open && (
                <div className="border-t border-slate-100 px-5 py-4">
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

  // URL params
  const q = sp.get("q") ?? "";
  const country = sp.get("country") ?? "ALL";
  const department = sp.get("department") ?? "ALL";
  const level = sp.get("level") ?? "ALL";
  const pageParam = Number(sp.get("page") || "1") || 1;

  // local input state (debounce for faster UX)
  const [qDraft, setQDraft] = useState(q);
  const qDebounceRef = useRef<number | null>(null);

  // hero hover image
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

  // Keep qDraft synced when user navigates/back
  useEffect(() => {
    setQDraft(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, lang]);

  // Scroll fix: when open this page (SPA) always go to top once
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Fetch jobs (คงโครงสร้างเดิม)
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
        setError(e?.message ?? "Error");
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
  }, [lang, q, country, department, level]);

  /** ✅ NEW: สร้าง options ของ Country/Department/Level จาก jobs ที่โหลดมาจริง */
  const filterOptions: FilterOptions = useMemo(() => {
    const uniq = (xs: string[]) =>
      Array.from(new Set(xs.map((x) => normalizeOpt(x)).filter((x) => x && x !== "null" && x !== "undefined")));

    // NOTE: ใช้ field จาก job ที่คุณมีอยู่จริง: country / department / level
    const countries = uniq(jobs.map((j: any) => j?.country)).sort((a, b) => a.localeCompare(b));
    const departments = uniq(jobs.map((j: any) => j?.department)).sort((a, b) => a.localeCompare(b));
    const levels = uniq(jobs.map((j: any) => j?.level)).sort((a, b) => a.localeCompare(b));

    return { countries, departments, levels };
  }, [jobs]);

  // Client-side pagination (15 per page)
  const totalCount = useMemo(() => (total > 0 ? total : jobs.length), [total, jobs.length]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const page = useMemo(() => clamp(pageParam, 1, totalPages), [pageParam, totalPages]);

  const pagedJobs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return jobs.slice(start, start + PAGE_SIZE);
  }, [jobs, page]);

  // Clamp URL page silently
  useEffect(() => {
    if (pageParam !== page) {
      const merged = new URLSearchParams(sp);
      if (page <= 1) merged.delete("page");
      else merged.set("page", String(page));
      setSp(merged, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageParam, totalPages]);

  // When page changes -> scroll to top of list
  const listTopRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listTopRef.current) return;
    const y = listTopRef.current.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [page]);

  // Debounce qDraft -> updateParams(q) (reset page)
  useEffect(() => {
    if (qDraft === q) return;
    if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    qDebounceRef.current = window.setTimeout(() => {
      updateParams({ q: qDraft, page: "1" });
    }, 250);
    return () => {
      if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  function onFiltersChange(next: { country?: string; department?: string; level?: string }) {
    updateParams({
      country: next.country ?? country,
      department: next.department ?? department,
      level: next.level ?? level,
      page: "1",
    });
  }

  function onChangePage(p: number) {
    const next = clamp(p, 1, totalPages);
    updateParams({ page: next <= 1 ? "ALL" : String(next) }); // delete when <=1
  }

return (
  <>
    <Helmet>
      <title>{title}</title>
    </Helmet>

    <section className="bg-white">
      {/* HERO
          ✅ ไม่มีเงาดำคลุมภาพ (เอา black overlay ออก) แต่ยังมีไล่ขาวด้านล่าง
          ✅ ปรับสูงให้พอดีกับกรอบแดง (คุมด้วย height ไม่ใช้ pt ratio)
          - Mobile: 1:1 (square) แต่ไม่เกินจอ
          - Desktop: feel 1920x800 แต่คุมให้ไม่สูงเกินด้วย clamp
      */}
      <div
        className="relative overflow-hidden border-b border-slate-200"
        onMouseEnter={() => setHeroHover(true)}
        onMouseLeave={() => setHeroHover(false)}
        onTouchStart={() => setHeroHover((v) => !v)}
      >
        {/* Height controller */}
        <div
          className={cn(
            "relative overflow-hidden",
            // Desktop height = clamp(min, preferred, max) -> พอดีกรอบแดง / ไม่สูงเกิน
            "md:h-[clamp(260px,22vw,380px)]",
            // Mobile เป็น square และคุมไม่ให้สูงเกิน
            "aspect-square max-h-[520px] md:aspect-auto"
          )}
        >
          {/* Background layers */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ backgroundImage: `url(/images/jobs-hero.jpg)` }}
            />
            <div
              className={cn(
                "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
                heroHover ? "opacity-100" : "opacity-0"
              )}
              style={{ backgroundImage: `url(/images/jobs-hero-hover.jpg)` }}
            />

            {/* ✅ White-only readability (no dark mask) */}
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_18%,rgba(255,255,255,0.65),transparent_62%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_85%_22%,rgba(255,255,255,0.35),transparent_60%)]" />
            {/* white fade from bottom */}

          </div>

          {/* Content */}
          <div className="absolute inset-0">
            <div className="mx-auto h-full w-full max-w-[1240px] px-4">
              <div className="flex h-full items-center py-6 md:py-8">
                <div className="w-full max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/25 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    ตำแหน่งที่ว่างอยู่
                  </div>

                  <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
                    ตำแหน่งที่เปิดรับ
                  </h1>

                  <p className="mt-2 text-xs text-slate-700 md:text-sm">
                    พิมพ์คำค้นหา • ค้นหางานที่เหมาะกับความสามารถของคุณ
                  </p>

                  {/* Search box in hero (ยาวเต็มจอใน desktop ภายใต้ container) */}
                  <div className="mt-4 w-full rounded-3xl border border-white/45 bg-white/25 p-3 backdrop-blur md:p-3.5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                        <input
                          className={cn(
                            "w-full rounded-2xl border border-white/55 bg-white/35 px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-500",
                            "outline-none transition focus:border-orange-200 focus:ring-4 focus:ring-orange-200/30"
                          )}
                          value={qDraft}
                          placeholder={t("common.search")}
                          onChange={(e) => setQDraft(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <div className="text-sm font-semibold text-slate-900">
                          {loading ? t("common.loading") : `${totalCount} ${t("jobs.openings")}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* fade to white (extra soft) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-white/0 to-white" />
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            {/* ✅ ส่ง options จาก jobs จริงเข้า JobFilters */}
            <JobFilters
              country={country}
              department={department}
              level={level}
              options={filterOptions}
              onChange={onFiltersChange}
            />
          </div>

          <div>
            <div ref={listTopRef} className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{t("jobs.title")}</h2>
                  <div className="mt-1 text-sm text-slate-600">
                    {loading ? t("common.loading") : `${totalCount} ${t("jobs.openings")} • ${PAGE_SIZE}/หน้า`}
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                    หน้า <span className="font-bold">{page}</span> / {totalPages}
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
                  <div className="mt-4 grid gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                </div>
              ) : jobs.length === 0 ? (
                <div className="card p-6 text-sm text-slate-600">{t("jobs.empty")}</div>
              ) : (
                <>
                  <div className="space-y-4">
                    {pagedJobs.map((j) => (
                      <JobCard key={j.job_id} job={j} />
                    ))}
                  </div>

                  <Pagination page={page} totalPages={totalPages} onChange={onChangePage} />
                </>
              )}
            </div>
          </div>
        </div>


          {/* Hiring process */}
          <div className="mt-10">
            <HiringProcessCards />
          </div>

          {/* FAQ */}
          <div className="mt-8">
            <FaqTabs />
          </div>
        </div>
      </section>
    </>
  );
}
