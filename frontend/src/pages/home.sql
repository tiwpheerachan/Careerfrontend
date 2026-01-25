import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Briefcase,
  Globe2,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Building2,
  Flag,
  ChevronDown,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

import { listJobs } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
        <div>
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Smart field getters (รองรับหลาย schema) ---------- */
function getJobId(j: any) {
  return String(j?.job_id ?? j?.id ?? j?.jobId ?? j?.jobID ?? "");
}
function getJobTitle(j: any) {
  return String(j?.title ?? j?.job_title ?? j?.name ?? j?.position ?? "Untitled");
}
function getJobDept(j: any) {
  return String(j?.department ?? j?.dept ?? j?.team ?? j?.function ?? "Other");
}
function getJobLevel(j: any) {
  return String(j?.level ?? j?.seniority ?? j?.job_level ?? j?.grade ?? "ALL");
}
function getJobCountry(j: any) {
  const v =
    j?.country ??
    j?.country_code ??
    j?.countryCode ??
    j?.location_country ??
    j?.locationCountry ??
    j?.region ??
    j?.office_country ??
    "";
  return String(v || "ALL");
}

/** ---------- Home: Country/Office presentation config ---------- */
type Office = {
  key: string;
  label: string;
  countryValueMatch: string[];
  flagEmoji?: string;
  bgImage: string;
  portraitImage: string;
  tagline?: string;
};

const OFFICES: Office[] = [
  {
    key: "TH",
    label: "Thailand",
    countryValueMatch: ["TH", "Thailand", "ไทย", "Bangkok"],
    flagEmoji: "🇹🇭",
    bgImage: "/images/offices/th-bg.jpg",
    portraitImage: "/images/offices/th-portrait.jpg",
    tagline: "Bangkok • Local excellence to global scale",
  },
  {
    key: "CN",
    label: "China",
    countryValueMatch: ["CN", "China", "จีน"],
    flagEmoji: "🇨🇳",
    bgImage: "/images/offices/cn-bg.jpg",
    portraitImage: "/images/offices/cn-portrait.jpg",
    tagline: "Innovation hub • Supply chain & product",
  },
  {
    key: "ID",
    label: "Indonesia",
    countryValueMatch: ["ID", "Indonesia", "อินโดนีเซีย"],
    flagEmoji: "🇮🇩",
    bgImage: "/images/offices/id-bg.jpg",
    portraitImage: "/images/offices/id-portrait.jpg",
    tagline: "SEA growth • Marketplace acceleration",
  },
  {
    key: "PH",
    label: "Philippines",
    countryValueMatch: ["PH", "Philippines", "ฟิลิปปินส์"],
    flagEmoji: "🇵🇭",
    bgImage: "/images/offices/ph-bg.jpg",
    portraitImage: "/images/offices/ph-portrait.jpg",
    tagline: "Operations • Customer experience",
  },
  {
    key: "VN",
    label: "Vietnam",
    countryValueMatch: ["VN", "Vietnam", "เวียดนาม"],
    flagEmoji: "🇻🇳",
    bgImage: "/images/offices/vn-bg.jpg",
    portraitImage: "/images/offices/vn-portrait.jpg",
    tagline: "Regional team • Logistics & growth",
  },
  {
    key: "BR",
    label: "Brazil",
    countryValueMatch: ["BR", "Brazil", "บราซิล"],
    flagEmoji: "🇧🇷",
    bgImage: "/images/offices/br-bg.jpg",
    portraitImage: "/images/offices/br-portrait.jpg",
    tagline: "LATAM • Go-to-market & distribution",
  },
  {
    key: "MX",
    label: "Mexico",
    countryValueMatch: ["MX", "Mexico", "เม็กซิโก"],
    flagEmoji: "🇲🇽",
    bgImage: "/images/offices/mx-bg.jpg",
    portraitImage: "/images/offices/mx-portrait.jpg",
    tagline: "LATAM expansion • Partnerships",
  },
];

/** ---------- Horizontal 16:8 gallery images (17 boxes) ---------- */
const GALLERY_16x8: string[] = Array.from({ length: 17 }).map((_, i) => `/images/gallery/g${i + 1}.jpg`);

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const nav = useNavigate();

  // jobs
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // hero hover image (same behavior like JobsPage)
  const [heroHover, setHeroHover] = useState(false);

  // office selector
  const [officeKey, setOfficeKey] = useState<string>(OFFICES[0]?.key ?? "TH");
  const office = useMemo(() => OFFICES.find((o) => o.key === officeKey) ?? OFFICES[0], [officeKey]);

  // office jobs paging (3-4 cards per page)
  const OFFICE_PAGE_SIZE = 4;

function selectOffice(nextKey: string) {
  setOfficeKey(nextKey);
  setOfficePage(1); // รีเซ็ตหน้า “ทันที” กัน state ค้าง
}
  const [officePage, setOfficePage] = useState(1);

  // gallery (auto marquee 2 rows)
  const [galleryPaused, setGalleryPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingJobs(true);
    setJobsError(null);

    listJobs({ lang })
      .then((r: any) => {
        if (!alive) return;
        const list = Array.isArray(r?.jobs) ? (r.jobs as Job[]) : [];
        setJobs(list);
      })
      .catch((e: any) => {
        if (!alive) return;
        setJobsError(e?.message ?? "Error");
        setJobs([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingJobs(false);
      });

    return () => {
      alive = false;
    };
  }, [lang]);

  /** ---------- Derived: Department counts from REAL jobs ---------- */
  const deptCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs as any[]) {
      const dRaw = getJobDept(j);
      const d = dRaw?.trim() || "Other";
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }, [jobs]);

  const totalOpenings = useMemo(() => jobs.length, [jobs.length]);

  /** ---------- Derived: office jobs (filter by office match) ---------- */
  const officeJobs = useMemo(() => {
    const matches = office?.countryValueMatch ?? [];
    const list = (jobs as any[]).filter((j) => {
      const c = getJobCountry(j);
      if (!c) return false;
      return matches.some((k) => String(c).toLowerCase().includes(String(k).toLowerCase()));
    });

    return list.length ? list : (jobs as any[]).slice(0, 16);
  }, [jobs, office]);

  const officeJobsCount = useMemo(() => officeJobs.length, [officeJobs.length]);

  const officeTotalPages = useMemo(() => Math.max(1, Math.ceil(officeJobs.length / OFFICE_PAGE_SIZE)), [officeJobs.length]);

  const officePagedJobs = useMemo(() => {
    const p = Math.max(1, Math.min(officePage, officeTotalPages));
    const start = (p - 1) * OFFICE_PAGE_SIZE;
    return officeJobs.slice(start, start + OFFICE_PAGE_SIZE);
  }, [officeJobs, officePage, officeTotalPages]);

  useEffect(() => {
    setOfficePage(1);
  }, [officeKey]);

  /** ---------- Click dept -> go to jobs with filter ---------- */
  function goToDept(dept: string) {
    const sp = new URLSearchParams();
    sp.set("department", dept);
    nav(`/jobs?${sp.toString()}`);
  }

  /** ---------- Click office -> go to jobs with country filter ---------- */
  function goToOfficeJobs(of: Office) {
    const sp = new URLSearchParams();
    sp.set("country", of.key);
    nav(`/jobs?${sp.toString()}`);
  }

  /** ---------- Gallery split into 2 rows + duplicate for seamless ---------- */
  const galleryTop = useMemo(() => GALLERY_16x8.filter((_, i) => i % 2 === 0), []);
  const galleryBottom = useMemo(() => GALLERY_16x8.filter((_, i) => i % 2 === 1), []);

  const topTrack = useMemo(() => [...galleryTop, ...galleryTop], [galleryTop]);
  const bottomTrack = useMemo(() => [...galleryBottom, ...galleryBottom], [galleryBottom]);
  useEffect(() => {
  // ถ้า officeTotalPages ลดลง แล้วหน้าเดิมเกิน -> clamp ลง
  setOfficePage((p) => Math.min(Math.max(1, p), officeTotalPages));
}, [officeTotalPages]);

  return (
    <>
      <Helmet>
        <title>SHD Careers</title>
        <meta name="description" content="SHD global recruitment — multi-country, multi-language, responsive." />
      </Helmet>

 {/* ===========================
    HERO (FULL-BLEED BACKGROUND + WOW STYLE)
    ✅ ทำให้รูปที่วง “เต็มจอตามกรอบแดง” เป็นพื้นหลังทั้ง section
    ✅ การ์ดด้านขวาถูกยุบเป็น overlay decoration (ยัง hover สลับภาพได้)
    ✅ CSS สวยแบบ premium: aurora glow + noise + glass
=========================== */}
{/* ===========================
    HERO (FULL-BLEED BG + CENTERED HEADLINE + MOUSE GLOW)
    ✅ ลบกล่องรูปเล็กออก เหลือแค่รูปพื้นหลังเต็มจอ
    ✅ จัดหัวข้อ/ข้อความให้อยู่ “กึ่งกลาง”
    ✅ เม้าส์เลื่อนไปตรงไหน → สว่างขึ้นบริเวณนั้น (spotlight)
    ✅ ยัง hover สลับ desktop/mobile bg ได้
=========================== */}

{/* HERO */}
<section
  className="group relative isolate overflow-hidden bg-slate-950"
  onMouseEnter={() => setHeroHover(true)}
  onMouseLeave={() => setHeroHover(false)}
  onTouchStart={() => setHeroHover((v) => !v)}
>
  {/* FULL-BLEED BACKGROUND */}
  <div className="absolute inset-0">
    {/* desktop bg */}
    <div
      className={cn(
        "absolute inset-0 bg-cover bg-center",
        "scale-[1.03] will-change-transform",
        "transition-opacity duration-700"
      )}
      style={{ backgroundImage: `url(/images/5_07_Charge_Faster_Clean_Longer_1200x.webp)` }}
    />
    {/* mobile alt bg (hover/toggle) */}
    <div
      className={cn(
        "absolute inset-0 bg-cover bg-center",
        "scale-[1.03] will-change-transform",
        "transition-opacity duration-700",
        heroHover ? "opacity-100" : "opacity-0"
      )}
      style={{ backgroundImage: `url(/images/x50-ultra-banner.webp)` }}
    />

{/* Gold core */}
<div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_30%,rgba(255,215,120,0.22),transparent_65%)]" />
{/* Rose accent */}
<div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_35%,rgba(255,170,150,0.18),transparent_70%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_22%,rgba(255,255,255,0.22),transparent_60%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_76%_18%,rgba(56,189,248,0.22),transparent_58%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_78%_70%,rgba(168,85,247,0.20),transparent_62%)]" />

    {/* subtle noise */}
<div
  className="absolute inset-0 opacity-[0.18] mix-blend-overlay bg-cover bg-center"
  style={{
    backgroundImage: "url(/images/impact/impact-1.jpg)",
  }}
/>


    {/* top highlight line */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
  </div>

  {/* MOUSE SPOTLIGHT (สว่างตามเม้าส์) */}
  <div
    className={cn(
      "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
      "group-hover:opacity-100"
    )}
    style={{
      background:
        "radial-gradient(520px 360px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.16), rgba(255,255,255,0.06) 40%, transparent 70%)",
    }}
  />

  {/* CONTENT */}
  <div
    className="container-page relative py-14 sm:py-16 lg:py-20"
    onMouseMove={(e) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    }}
  >
    {/* Centered stack */}
    <div className="mx-auto max-w-[920px] text-center">
      {/* badge centered */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.65)]" />
        Global Recruitment for SHD
      </div>

      <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
        {t("home.headline")}
      </h1>

      <p className="mx-auto mt-4 max-w-[70ch] text-base leading-relaxed text-white/80 sm:text-lg">
        {t("home.subhead")}
      </p>

      {/* CTAs centered */}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/jobs"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
            "bg-white text-slate-950 shadow-[0_22px_70px_rgba(0,0,0,0.40)]",
            "transition hover:-translate-y-0.5 hover:shadow-[0_30px_110px_rgba(0,0,0,0.48)]"
          )}
        >
          {t("home.ctaPrimary")} <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          to="/why-shd"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
            "border border-white/16 bg-white/10 text-white backdrop-blur",
            "transition hover:bg-white/16 hover:-translate-y-0.5"
          )}
        >
          {t("home.ctaSecondary")}
        </Link>
      </div>

      {/* meta pills centered */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/75">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
          <Briefcase className="h-3.5 w-3.5" />
          {loadingJobs ? "Loading jobs…" : `${totalOpenings} openings`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
          <Globe2 className="h-3.5 w-3.5" />
          SEA → Asia → LATAM
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Premium hiring experience
        </span>
      </div>

      <p className="mt-5 text-xs text-white/55">{t("home.bannerNote")}</p>
    </div>

    {/* FEATURES (ยังอยู่ด้านล่างเหมือนเดิม แต่ให้เข้าธีมมืดขึ้น) */}
    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Feature icon={<Globe2 className="h-5 w-5" />} title="Multi-country" desc="Thailand, China, Indonesia, Philippines, Vietnam, Brazil, Mexico." />
      <Feature icon={<Sparkles className="h-5 w-5" />} title="3 languages" desc="Thai, English, Chinese with instant switching." />
      <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Professional" desc="Clean, formal design like top global career sites." />
      <Feature icon={<Briefcase className="h-5 w-5" />} title="Structured jobs" desc="Filter by Country / Department / Level." />
    </div>
  </div>
</section>


      {/* FIND YOUR FIT */}
      <section className="container-page py-14">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              <Briefcase className="h-4 w-4" />
              Find your fit
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">ค้นหาความชอบของคุณ</h2>
            <p className="mt-2 text-sm text-slate-600">อิงจากตำแหน่งที่ประกาศจริง: เลือกแผนก แล้วดูว่ามีกี่ตำแหน่งเปิดรับ</p>
          </div>

          <Link to="/jobs" className="btn btn-primary">
            ไปหน้าตำแหน่งงานทั้งหมด <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {jobsError && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{jobsError}</div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingJobs ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-3xl bg-slate-100" />)
          ) : deptCounts.length === 0 ? (
            <div className="card p-6 text-sm text-slate-600">ยังไม่มีตำแหน่งงานในระบบ</div>
          ) : (
            deptCounts.map(([dept, count]) => (
              <button
                key={dept}
                type="button"
                onClick={() => goToDept(dept)}
                className="group card p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{dept}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      รับสมัคร <span className="font-bold text-slate-900">{count}</span> ตำแหน่ง
                    </div>
                  </div>
                  <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-700">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                    <Users className="h-3.5 w-3.5" /> Team
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                    <Briefcase className="h-3.5 w-3.5" /> Openings
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500">
          * คลิกการ์ดเพื่อไปหน้า <span className="font-semibold">Jobs</span> พร้อม filter ตามแผนก
        </div>
      </section>
{/* ===========================
    OFFICES: Grow around the world
    ✅ FIXED:
    - เปลี่ยนประเทศ/กด flag/chips -> reset page = 1 (ไม่บัค)
    - กัน “หลายงานโผล่/ซ้ำ” ด้วย key ที่ stable + unique ตาม officeKey+page
    - แสดง 4 ช่องเสมอ (ถ้าน้อยกว่า 4 เติม empty card)
    - กันล้นขอบด้วย minmax(0,1fr) + min-w-0 ทุกจุดที่จำเป็น
    - เว้นระยะงาน ↔ รูปมากขึ้น (gap + portrait fixed width)
=========================== */}

{/* ✅ helpers ที่ต้องมีใน component (อย่าวางใน JSX) */}
{/*
const PAGE_SIZE = 4;

const selectOffice = (nextKey: string) => {
  setOfficeKey(nextKey);
  setOfficePage(1);
};

// ✅ กันกรณี total pages เปลี่ยนแล้ว page หลุดช่วง
useEffect(() => {
  setOfficePage((p) => Math.min(Math.max(1, p), officeTotalPages));
}, [officeTotalPages]);

// ✅ ควรรีเซ็ต page เมื่อเปลี่ยน officeKey จากที่อื่นด้วย
useEffect(() => {
  setOfficePage(1);
}, [officeKey]);
*/}
<section className="bg-slate-50">
  {/* ✅ ให้ส่วนหัว (title+dropdown) ยังอยู่ใน container ปกติ */}
  <div className="container-page py-14">
    <div className="text-center">
      <div className="text-xs font-semibold tracking-wide text-emerald-700">
        Local and global
      </div>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
        Grow around the world
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        เลือกประเทศ แล้วดูตำแหน่งงานในประเทศนั้น (แสดง 4 ช่องต่อหน้า)
      </p>

      {/* Dropdown row */}
      <div className="mx-auto mt-6 flex max-w-[640px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <div className="relative w-full sm:w-[420px]">
          <select
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-200 focus:ring-4 focus:ring-emerald-100"
            value={officeKey}
            onChange={(e) => selectOffice(e.target.value)} // ✅ ใช้ตัวนี้ (reset page)
          >
            {OFFICES.map((o) => (
              <option key={o.key} value={o.key}>
                {o.flagEmoji ? `${o.flagEmoji} ` : ""}
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>

        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
          <Briefcase className="h-4 w-4 text-slate-700" />
          {loadingJobs ? "Loading…" : `${officeJobsCount} openings`}
        </div>
      </div>
    </div>
  </div>

  {/* ✅ FULL-BLEED BACKGROUND ZONE (กว้างเต็มจอจริง) */}
  <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
    {/* ✅ ขอบโค้ง + เงา + animation เข้า */}
    <div className="relative overflow-hidden rounded-[32px]">
      {/* Background image area */}
      <div className="relative min-h-[520px] md:min-h-[520px] lg:min-h-[560px]">
        {/* bg image */}
        <img
          src={office.bgImage}
          alt={`${office.label} office`}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            "scale-[1.03] will-change-transform",
            "animate-[fadeIn_700ms_ease-out]"
          )}
        />

        {/* overlays (ทำให้สวย+อ่านได้) */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_28%_40%,rgba(255,255,255,0.70),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_78%_22%,rgba(16,185,129,0.18),transparent_58%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white" />

        {/* ✅ MOBILE: country chips (ย้ายให้ไม่ไปซ่อนใต้กรอบ และไม่ทับแปลกๆ) */}
        <div className="absolute left-0 right-0 top-4 z-20 px-4 md:hidden">
          <div
            className={cn(
              "flex gap-2 overflow-auto",
              "rounded-3xl border border-white/55 bg-white/35 p-2 backdrop-blur-xl",
              "shadow-[0_18px_70px_rgba(0,0,0,0.18)]",
              "animate-[floatIn_800ms_cubic-bezier(.2,.8,.2,1)]"
            )}
          >
            {OFFICES.map((o) => {
              const active = o.key === officeKey;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => selectOffice(o.key)} // ✅ reset page
                  className={cn(
                    "shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                    "active:scale-[0.98]",
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_10px_26px_rgba(16,185,129,0.20)]"
                      : "border-white/55 bg-white/20 text-slate-800 hover:bg-white/35"
                  )}
                >
                  <span className="mr-1">{o.flagEmoji ?? "🏳️"}</span>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

       

        {/* ✅ Main overlay content (อยู่ใน container-page แต่ bg เต็มจอ) */}
        <div className="absolute inset-0 flex items-end">
          <div className="container-page w-full px-4 pb-7 md:pb-10">
            {/* ✅ ปรับให้ “เต็มจอ web ทั่วไป” มากขึ้น */}
            <div className="mx-auto w-full max-w-[1280px]">
              <div className="grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-12">
                {/* Left: jobs card */}
                <div
                  className={cn(
                    "min-w-0 rounded-3xl border border-white/60 bg-white/28 p-5 backdrop-blur-xl md:p-6",
                    "shadow-[0_28px_120px_rgba(0,0,0,0.10)]",
                    "animate-[rise_650ms_cubic-bezier(.2,.8,.2,1)]"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                      <Flag className="h-3.5 w-3.5" />
                      {office.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {office.tagline ?? "Global team"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {loadingJobs ? "…" : `${officeJobsCount} openings`}
                    </span>
                  </div>

                  <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    สำนักงานของเรา
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    เลือกประเทศ แล้วสำรวจตำแหน่งงานที่เปิดรับในประเทศนั้น
                  </div>

                  {/* ✅ 4 ช่องเสมอ */}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {loadingJobs ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-white/60" />
                      ))
                    ) : (
                      Array.from({ length: 4 }).map((_, i) => {
                        const j = (officePagedJobs as any[])?.[i];

                        if (!j) {
                          return (
                            <div
                              key={`empty-${officeKey}-${officePage}-${i}`}
                              className="h-[88px] rounded-2xl border border-white/50 bg-white/20 backdrop-blur"
                            />
                          );
                        }

                        const id = getJobId(j);
                        const title = getJobTitle(j);
                        const dept = getJobDept(j);
                        const lvl = getJobLevel(j);
                        const href = id ? `/jobs/${id}` : "/jobs";
                        const stableKey = `${officeKey}-${officePage}-${id || "noid"}-${i}`;

                        return (
                          <Link
                            key={stableKey}
                            to={href}
                            className={cn(
                              "group min-w-0 rounded-2xl border border-white/60 bg-white/40 p-4 backdrop-blur-xl",
                              "transition hover:-translate-y-0.5 hover:bg-white/55",
                              "hover:shadow-[0_18px_60px_rgba(0,0,0,0.10)]"
                            )}
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="min-w-0 text-sm font-black text-slate-900 line-clamp-2 break-words">
                                  {title}
                                </div>
                                <div className="mt-1 min-w-0 text-xs text-slate-700 line-clamp-1 break-words">
                                  {dept} • {lvl}
                                </div>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setOfficePage((p) => Math.max(1, p - 1))}
                      disabled={officePage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>

                    <div className="text-xs font-semibold text-slate-700">
                      Page {officePage} / {officeTotalPages}
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setOfficePage((p) => Math.min(officeTotalPages, p + 1))}
                      disabled={officePage >= officeTotalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" className="btn btn-primary" onClick={() => goToOfficeJobs(office)}>
                      ดูงานทั้งหมดของ {office.label} <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link to="/jobs" className="btn btn-ghost">
                      ไปหน้าตำแหน่งงานทั้งหมด
                    </Link>
                  </div>
                </div>

                {/* Right portrait */}
                <div className="hidden md:block">
                  <div
                    className={cn(
                      "relative mx-auto w-full max-w-[420px]",
                      "animate-[rise_720ms_cubic-bezier(.2,.8,.2,1)]"
                    )}
                  >
                    <div className="rounded-[28px] border border-white/60 bg-white/26 p-3 backdrop-blur-xl shadow-[0_28px_120px_rgba(0,0,0,0.10)]">
                      <div className="relative overflow-hidden rounded-[22px]">
                        <img
                          src={office.portraitImage}
                          alt={`${office.label} portrait`}
                          className="h-[340px] w-full object-cover transition duration-700 hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/35" />
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-700">
                          {office.flagEmoji ?? "🏳️"} {office.label}
                        </div>
                        <div className="text-[11px] text-slate-600">Replaceable image</div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      * เปลี่ยนรูปได้ที่ <span className="font-semibold">/public/images/offices/</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* note */}
              <div className="mt-4 text-center text-xs text-slate-600">
                * ระบบจะแสดงงานจากประเทศที่เลือก (ถ้า job.country ไม่ match จะ fallback แสดงงานชุดแรก)
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Keyframes (ไม่ต้องแก้ไฟล์อื่น) */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(1.06); }
            to   { opacity: 1; transform: scale(1.03); }
          }
          @keyframes rise {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes floatIn {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  </div>
</section>

{/* ✅ UPDATED UI: smaller cards, no border, scrollable longer + new copy */}
<section
  className="container-page py-14"
  onMouseEnter={() => setGalleryPaused(true)}
  onMouseLeave={() => setGalleryPaused(false)}
>
  <style>{`
    @keyframes shd-marquee-left {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes shd-marquee-right {
      0% { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }
    /* hide scrollbar (optional) */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>

  <div className="flex items-end justify-between gap-4">
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
        <Sparkles className="h-4 w-4" />
        Partners
      </div>

      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
        ผู้จัดจำหน่ายอย่างเป็นทางการ
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Authorized distributor of the following trademarks
      </p>
    </div>
  </div>

  {/* ✅ No border, softer container */}
  <div className="mt-6 rounded-3xl bg-white/70 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur">
    <div className="p-4 md:p-5">
      {/* Row 1 */}
      <div className="relative">
        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/80 to-white/0" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/80 to-white/0" />

        {/* scrollable track */}
        <div className="no-scrollbar overflow-x-auto">
          <div
            className="flex w-max gap-2.5 pr-6 will-change-transform"
            style={{
              animation: "shd-marquee-left 34s linear infinite",
              animationPlayState: galleryPaused ? "paused" : "running",
            }}
          >
            {topTrack.map((src, idx) => (
              <div key={`${src}-top-${idx}`} className="shrink-0">
                {/* ✅ smaller card widths */}
                <div className="w-[160px] sm:w-[190px] md:w-[220px]">
                  <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative aspect-[16/8]">
                      <img
                        src={src}
                        alt={`Gallery top ${idx + 1}`}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/35" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-3.5" />

      {/* Row 2 */}
      <div className="relative">
        {/* fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/80 to-white/0" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/80 to-white/0" />

        {/* scrollable track */}
        <div className="no-scrollbar overflow-x-auto">
          <div
            className="flex w-max gap-2.5 pr-6 will-change-transform"
            style={{
              animation: "shd-marquee-right 36s linear infinite",
              animationPlayState: galleryPaused ? "paused" : "running",
            }}
          >
            {bottomTrack.map((src, idx) => (
              <div key={`${src}-bot-${idx}`} className="shrink-0">
                <div className="w-[160px] sm:w-[190px] md:w-[220px]">
                  <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative aspect-[16/8]">
                      <img
                        src={src}
                        alt={`Gallery bottom ${idx + 1}`}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/35" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
    </>
  );
}
