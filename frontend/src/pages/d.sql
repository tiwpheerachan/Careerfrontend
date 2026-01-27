// frontend/src/pages/AboutPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Globe2,
  HeartHandshake,
  MapPin,
  Rocket,
  Smile,
  Sparkles,
  Target,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const set = () => setReduced(!!mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);
  return reduced;
}

/** count animation: 0 → target */
function useCountTo(target: number, opts?: { ms?: number; enabled?: boolean }) {
  const { ms = 820, enabled = true } = opts ?? {};
  const reduced = usePrefersReducedMotion();
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (reduced) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3); // ease-out
      const next = Math.max(from, Math.min(to, Math.round(from + (to - from) * e)));
      setV(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, enabled, reduced]);

  return v;
}

/** mouse spotlight (light mode) */
function useMouseSpotlight() {
  const ref = useRef<HTMLElement | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  };

  return { ref, onMove };
}

/** ✅ Section with image background (everything floats above) */
function BgSection({
  id,
  bg,
  className,
  children,
  overlay = "light",
  topFade = true,
  bottomFade = true,
}: {
  id?: string;
  bg: string;
  className?: string;
  children: React.ReactNode;
  overlay?: "light" | "dark";
  topFade?: boolean;
  bottomFade?: boolean;
}) {
  return (
    <section id={id} className={cn("relative isolate overflow-hidden", className)}>
      {/* background image */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
        {/* soft overlays for readability */}
        {overlay === "light" ? (
          <>
            <div className="absolute inset-0 bg-white/65" />
            <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_20%_10%,rgba(251,191,36,0.22),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_75%_80%,rgba(16,185,129,0.18),transparent_58%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-slate-950/55" />
            <div className="absolute inset-0 bg-[radial-gradient(1000px_520px_at_20%_15%,rgba(56,189,248,0.18),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(1100px_540px_at_70%_75%,rgba(34,197,94,0.14),transparent_58%)]" />
          </>
        )}

        {topFade ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/90 to-transparent" />
        ) : null}
        {bottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/90 to-transparent" />
        ) : null}
      </div>

      {children}
    </section>
  );
}

function Pill({
  icon,
  children,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "good";
}) {
  const toneCls =
    tone === "brand"
      ? "border-amber-200 bg-amber-50/90 text-amber-900"
      : tone === "good"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
      : "border-slate-200 bg-white/85 text-slate-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur",
        toneCls
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function SectionHeader({
  kicker,
  title,
  desc,
  icon,
  align = "left",
}: {
  kicker: string;
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "text-center items-center" : "")}>
      <div className={cn("inline-flex", align === "center" ? "justify-center" : "")}>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
          {icon}
          {kicker}
        </span>
      </div>

      <h2 className={cn("text-2xl font-black tracking-tight text-slate-950 sm:text-3xl")}>{title}</h2>
      {desc ? <p className="max-w-[82ch] text-sm leading-relaxed text-slate-700">{desc}</p> : null}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/78 backdrop-blur",
        "shadow-[0_18px_70px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-100/55 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">{label}</div>
        {icon ? <div className="text-slate-700">{icon}</div> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
        {suffix ? <div className="text-sm font-semibold text-slate-500">{suffix}</div> : null}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_18px_70px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-700">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function Timeline({ items }: { items: Array<{ year: string; title: string; desc: string; tag?: string }> }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      {items.map((it, i) => (
        <div
          key={`${it.year}-${i}`}
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-6 shadow-sm backdrop-blur"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-slate-200">
              <div className="text-sm font-black text-slate-950">{it.year}</div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-slate-950">{it.title}</div>
                {it.tag ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[11px] font-black text-emerald-900 backdrop-blur">
                    {it.tag}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-700">{it.desc}</div>

              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Build • Scale • Global</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AppsWall({
  title = "Apps for anything else",
  desc = "A living wall of our offices — curated moments across teams, cities, and cultures.",
  images,
  bgImage = "/images/offices/ph-bg.jpg",
}: {
  title?: string;
  desc?: string;
  images: Array<{ src: string; alt?: string }>;
  bgImage?: string;
}) {
  const reduced = usePrefersReducedMotion();

  // ✅ pause when mouse moves / wheels, resume after leave
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const setSpot = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  };

  const pauseNow = () => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    setPaused(true);
  };

  const resumeLater = (ms = 280) => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), ms);
  };

  useEffect(() => {
    return () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  // Build rows: top 2 rows -> 10 tiles (right side). bottom 3 rows -> 20 tiles (full width).
  const rows = useMemo(() => {
    const safe = images.length ? images : [{ src: "/images/offices/f1.png", alt: "Office" }];
    const pick = (n: number, offset: number) => {
      const out: Array<{ src: string; alt?: string }> = [];
      for (let i = 0; i < n; i++) out.push(safe[(offset + i) % safe.length]);
      return out;
    };
    return {
      top1: pick(10, 0),
      top2: pick(10, 10),
      b1: pick(20, 20),
      b2: pick(20, 40),
      b3: pick(20, 60),
    };
  }, [images]);

  const mkTrack = (key: string, items: Array<{ src: string; alt?: string }>, dir: "l" | "r") => (
    <div className="appsLane relative overflow-hidden">
      {/* ✅ end-of-row “fuzzy glow” (kept) */}
      <div className="laneGlow pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" />
      <div className={cn("appsTrack", dir === "l" ? "appsLeft" : "appsRight")}>
        {[...items, ...items].map((img, idx) => (
          <div key={`${key}-${idx}`} className="appsTile" title={img.alt || "app"}>
            <img
              src={img.src}
              alt={img.alt || "app"}
              className="h-full w-full object-cover"
              draggable={false}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="relative isolate overflow-hidden">
      {/* ✅ background image (PURE: no dark overlays) */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      </div>

      <div
        ref={wrapRef}
        className={cn(
          "appsWrap mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12",
          paused && "paused"
        )}
        onMouseEnter={() => pauseNow()}
        onMouseMove={(e) => {
          pauseNow(); // ✅ move mouse = stop
          setSpot(e); // ✅ spotlight follow
        }}
        onMouseLeave={() => resumeLater(260)}
        onWheel={() => {
          pauseNow(); // ✅ scroll wheel = stop briefly
          resumeLater(520);
        }}
      >
        {/* ✅ spotlight layer follows mouse (kept) */}
        <div className="appsSpot pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 md:opacity-100" />

        {/* top area */}
        <div className="relative grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          {/* left heading */}
          <div className="lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              OUR OFFICES
            </span>

<h3 className="appsTitle mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
  {title}
</h3>

<p className="appsDesc mt-3 max-w-[60ch] text-sm leading-relaxed text-slate-800">
  {desc}
</p>

<div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-700" />
          </div>

          {/* right: 2 rows of 10 tiles */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="w-full max-w-[760px]">{mkTrack("top1", rows.top1, "l")}</div>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-[760px]">{mkTrack("top2", rows.top2, "r")}</div>
            </div>
          </div>
        </div>

        {/* ✅ equal row spacing + closer */}
        <div className="relative mt-10 space-y-4">
          {mkTrack("b1", rows.b1, "l")}
          {mkTrack("b2", rows.b2, "r")}
          {mkTrack("b3", rows.b3, "l")}
        </div>

        <style>{`
          .appsWrap{
            position: relative;
            border-radius: 36px;
          }
.appsTitle, .appsDesc{
  text-shadow: none;
}

          /* ✅ spotlight that follows mouse (kept) */
          .appsSpot{
            background:
              radial-gradient(560px 420px at var(--mx,50%) var(--my,40%),
                rgba(255,255,255,0.22),
                rgba(255,255,255,0.10) 42%,
                transparent 74%);
          }

          /* ✅ ROW: remove lane frames entirely */
          .appsLane{
            border-radius: 0;
            padding: 0;
            background: transparent;
            border: none;
            backdrop-filter: none;
            box-shadow: none;
          }

          /* ✅ “fuzzy” glow at the end of each row (kept) */
          .laneGlow{
            width: 160px;
            height: 120px;
            background: radial-gradient(circle at 20% 50%,
              rgba(255,255,255,0.22),
              rgba(255,255,255,0.10) 42%,
              transparent 75%);
            filter: blur(10px);
            opacity: 0.9;
          }

          .appsTrack{
            display:flex;
            gap: 12px;
            width:max-content;
            will-change: transform;
            padding: 0; /* ✅ no inner padding (no frame look) */
            animation-duration: 85s;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          .appsLeft{ animation-name: apps-marquee-left; }
          .appsRight{ animation-name: apps-marquee-right; }

          @media (prefers-reduced-motion: reduce){
            .appsTrack{ animation: none !important; transform: none !important; }
            .appsSpot{ display:none; }
          }
          ${reduced ? ".appsTrack{ animation:none !important; transform:none !important; }" : ""}

          /* ✅ pause when mouse moves/enters/wheels */
          .appsWrap.paused .appsTrack{ animation-play-state: paused; }

          @keyframes apps-marquee-left{
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes apps-marquee-right{
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }

          /* ✅ TILE: no border/no background frame — just image */
          .appsTile{
            position: relative;
            overflow:hidden;
            flex: 0 0 auto;
            height: 44px;
            width: 44px;
            border-radius: 16px;
            border: none;
            background: transparent;
            box-shadow: none;
            transform: translateZ(0);
            transition: transform .18s ease, filter .18s ease;
          }
          @media (min-width: 640px){
            .appsTile{ height: 56px; width: 56px; border-radius: 18px; }
          }

          /* ✅ keep “shine + lift” feel without frame */
          .appsTile::after{
            content:"";
            position:absolute;
            inset:-55%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 56%);
            opacity: 0;
            transition: opacity .22s ease;
          }
          .appsTile:hover::after{ opacity: 1; }
          .appsTile:hover{
            transform: translateY(-2px);
            filter: drop-shadow(0 14px 26px rgba(0,0,0,0.28));
          }
        `}</style>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hero = useMouseSpotlight();

  // Stats
  const years = useCountTo(12, { ms: 820, enabled: true });
  const brands = useCountTo(20, { ms: 880, enabled: true });
  const kaStores = useCountTo(1000, { ms: 920, enabled: true });

  const authorizedBrands = useMemo(
    () => ["Xiaomi", "Dreame", "70mai", "Zepp", "Wanbo", "Levoit", "Jimmy", "MAIMO", "Usmile"],
    []
  );

  /**
   * ✅ Images
   * Put your files here:
   * - frontend/public/images/about/hero.jpg
   * - frontend/public/images/about/apps.jpg
   * - frontend/public/images/about/story.jpg
   * - frontend/public/images/about/mission.jpg
   * - frontend/public/images/about/culture.jpg
   * - frontend/public/images/about/journey.jpg
   * - frontend/public/images/about/awards.jpg
   *
   * Office tiles:
   * - frontend/public/images/offices/f1.png ... f100.png (or any count)
   */
  const officeWallImages = useMemo(() => {
    const many: Array<{ src: string; alt?: string }> = [];
    for (let i = 1; i <= 120; i++) many.push({ src: `/images/offices/f${i}.png`, alt: `Office ${i}` });

    // keep some extras (optional)
    many.push(
      { src: "/images/offices/th-bg.jpg", alt: "Thailand" },
      { src: "/images/offices/th-4bg.jpg", alt: "Thailand office" },
      { src: "/images/offices/th-bg1.jpg", alt: "Thailand team" },
      { src: "/images/offices/th-bg2.jpg", alt: "Thailand ops" },
      { src: "/images/offices/cn-bg.jpg", alt: "China" },
      { src: "/images/offices/id-bg.jpg", alt: "Indonesia" }
    );

    return many;
  }, []);

  const storyBlocks = useMemo(
    () => [
      {
        title: "เริ่มต้นจากเซินเจิ้น สู่การสร้างรากฐานในอาเซียน",
        body:
          "บริษัทเทคโนโลยีเซินหงเตี้ยน (เซินเจิ้น) จำกัด ก่อตั้งขึ้นอย่างเป็นทางการในปี 2013 ที่เมืองเซินเจิ้น และดำเนินธุรกิจมากว่า 12 ปี เราเริ่มต้นด้วยเป้าหมายเดียว — ช่วยให้แบรนด์ปรับตัวให้เข้ากับท้องถิ่นได้จริง และเติบโตได้เร็วในตลาดใหม่",
      },
      {
        title: "เห็นโอกาสทองของอาเซียน และลงทุนสร้างระบบครบวงจร",
        body:
          "เรามองเห็นโอกาสของตลาดอาเซียน จึงสร้างโครงสร้างพื้นฐานของตัวเองอย่างครบวงจร ทั้งเครือข่ายคลังสินค้าและโลจิสติกส์ท้องถิ่น ศูนย์บริการหลังการขาย ระบบ OMO และการตลาดดิจิทัล เพื่อช่วยให้แบรนด์บุกตลาดได้อย่างแม่นยำ",
      },
      {
        title: "จาก 0→1 ไปสู่ 1→100 ด้วย 4 มิติการเติบโต",
        body:
          'ด้วยแนวทาง “Brand Positioning → Channel → Marketing → Operations” เราช่วยผลักดันแบรนด์อิเล็กทรอนิกส์ผู้บริโภคกว่า 20+ แบรนด์เข้าสู่ตลาดอาเซียน หลายแบรนด์เติบโตขึ้นเป็นอันดับ 1 ในหมวดหมู่บนแพลตฟอร์มภายในปีแรก',
      },
    ],
    []
  );

  const mission =
    "เชื่อมต่อเทคโนโลยีล้ำสมัยให้ชีวิตของผู้ใช้งานหลากหลายมากขึ้น เรามุ่งมั่นยกระดับคุณภาพชีวิตของผู้ใช้งานทั่วโลก ผ่านนวัตกรรมเทคโนโลยีและโซลูชันอัจฉริยะ เพื่อสร้างไลฟ์สไตล์ที่สะดวกสบาย สุขภาพดี และมีสีสันยิ่งขึ้น";

  const vision =
    "เป็นแบรนด์ค้าปลีกใหม่ระดับโลกที่มีคุณค่าและอบอุ่น เราใส่ใจกับความหลากหลายทางวัฒนธรรม เติมเต็มความอบอุ่นในการบริการ และสร้างระบบที่มีผู้ใช้เป็นศูนย์กลาง";

  const whoWeAre = useMemo(
    () => [
      {
        icon: <Compass className="h-6 w-6 text-emerald-700" />,
        title: "เรียบง่าย",
        desc: "เราเชื่อในความเรียบง่ายและความจริงใจ ซื่อสัตย์ ติดดิน และจริงใจกับตัวเอง",
      },
      {
        icon: <Smile className="h-6 w-6 text-emerald-700" />,
        title: "มีความสุข",
        desc: "เราเป็นมิตร รักความสนุก และเต็มไปด้วยพลังงาน กระจายความสุขให้คนรอบตัว",
      },
      {
        icon: <Users className="h-6 w-6 text-emerald-700" />,
        title: "ร่วมมือร่วมใจ",
        desc: "เราแข็งแกร่งจากการทำงานร่วมกัน และให้คุณค่ากับเวลาที่มีร่วมกันในที่ทำงาน",
      },
    ],
    []
  );

  const journey = useMemo(
    () => [
      {
        year: "2013",
        title: "Founded in Shenzhen",
        desc: "ก่อตั้งอย่างเป็นทางการที่เซินเจิ้น เริ่มต้นจากประสบการณ์เชิงลึกในอุตสาหกรรมอิเล็กทรอนิกส์",
        tag: "Start",
      },
      {
        year: "2014–2017",
        title: "Rooted in Thailand",
        desc: "เลือกกลยุทธ์หยั่งรากในประเทศไทย เริ่มจากออฟไลน์ในกรุงเทพฯ และขยายเครือข่ายช่องทางท้องถิ่น",
        tag: "Local",
      },
      {
        year: "2018",
        title: "Brand-first Operations",
        desc: "ก้าวข้ามโมเดลเดิม หันมาเน้นการทำงานแบบแบรนด์เป็นหลัก สร้างทีมท้องถิ่นและร่วมมือเชิงลึกกับแบรนด์",
        tag: "Brand",
      },
      {
        year: "2019–2021",
        title: "Co-Brand Building Model",
        desc: "พัฒนาโมเดล “การสร้างแบรนด์ร่วมกัน” สนับสนุนตั้งแต่กำหนดตำแหน่งสินค้า ช่องทาง ไปจนถึงการตลาด",
        tag: "Co-build",
      },
      {
        year: "2022–Now",
        title: "Scale Across Regions",
        desc: "ขยายสเกลการดำเนินงาน สร้างระบบโลจิสติกส์ บริการหลังการขาย และการตลาดดิจิทัลให้แข็งแรงยิ่งขึ้น",
        tag: "Scale",
      },
    ],
    []
  );

  const awards = useMemo(
    () => [
      { year: "2021", title: "รางวัลผู้จำหน่ายยอดเยี่ยมประจำปี", org: "Tera Gadget — Lazada ประเทศไทย" },
      { year: "2021", title: "รางวัลผู้จำหน่ายดาวรุ่งแห่งปี", org: "SUNMOON168 — Shopee ประเทศไทย" },
      { year: "2023", title: "รางวัลสินค้าขายดีที่สุดแห่งปี", org: "Thaimall — Shopee ประเทศไทย" },
      { year: "2023", title: "รางวัลผู้ขายดีเด่นประจำปี", org: "70mai — Shopee ประเทศไทย" },
      { year: "2024", title: "รางวัลแบรนด์ที่พึงพอใจสูงสุด", org: "Dreame — Shopee ประเทศไทย" },
      { year: "2023", title: "อันดับ 1 ยอดขายหมวดเครื่องใช้ไฟฟ้าในครัวเรือน", org: "Dreame — Lazada ประเทศไทย" },
      { year: "2024", title: "รางวัลยอดเยี่ยมหมวดยานยนต์", org: "DDPai — LAZMALL Lazada ฟิลิปปินส์" },
      { year: "2024", title: "รางวัลยอดเยี่ยมหมวดอุปกรณ์อิเล็กทรอนิกส์", org: "Xiaomi — LAZMALL Lazada ฟิลิปปินส์" },
      { year: "Now", title: "อันดับ 1 ยอดขายในหลายแพลตฟอร์ม/ประเทศ", org: "70mai / DDPai / Wanbo ใน TH • ID • PH เป็นต้น" },
    ],
    []
  );

  return (
  <>
    <Helmet>
      <title>{t("nav.about")} • SHD Careers</title>
      <meta
        name="description"
        content="About SHD Technology — story, mission, vision, culture, journey, awards, and brand ecosystem."
      />
    </Helmet>

    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO (bg image) */}
      <BgSection bg="/images/about/hero.jpg" className="pb-4" overlay="light">
        <section
          ref={(n) => (hero.ref.current = n)}
          onMouseMove={hero.onMove}
          className={cn("relative")}
        >
          {/* spotlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 md:opacity-100"
            style={{
              background:
                "radial-gradient(520px 360px at var(--mx, 50%) var(--my, 30%), rgba(15,23,42,0.10), rgba(15,23,42,0.05) 45%, transparent 72%)",
            }}
          />

          {/* ✅ subtle contrast for readability (not full overlay) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(2,6,23,0.58) 0%, rgba(2,6,23,0.18) 46%, rgba(2,6,23,0.05) 70%, rgba(2,6,23,0.02) 100%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 pt-14 pb-8 sm:pt-16 sm:pb-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              {/* LEFT */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill icon={<Sparkles className="h-4 w-4" />} tone="brand">
                    Company Story
                  </Pill>
                  <Pill icon={<Globe2 className="h-4 w-4" />}>
                    Global • Localization • Growth
                  </Pill>
                  <Pill icon={<Truck className="h-4 w-4" />} tone="good">
                    OMO & Operations
                  </Pill>
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  SHD Technology
                  <span className="block text-white/80">
                    จากเซินเจิ้น สู่การเติบโตในอาเซียน
                  </span>
                </h1>

                <p className="mt-4 max-w-[78ch] text-base leading-relaxed text-white/80 sm:text-lg">
                  เราช่วยแบรนด์อิเล็กทรอนิกส์ผู้บริโภค “ปรับตัวให้เข้ากับท้องถิ่น” และเติบโตได้จริง
                  ตั้งแต่เริ่มต้นจากศูนย์ (0→1) ไปจนถึงการขยายขนาดธุรกิจ (1→100)
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to="/jobs"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                      "bg-white text-slate-950 shadow-[0_18px_70px_rgba(0,0,0,0.30)]",
                      "transition hover:-translate-y-0.5 hover:shadow-[0_28px_110px_rgba(0,0,0,0.34)] active:scale-[0.98]"
                    )}
                  >
                    ดูตำแหน่งงานทั้งหมด <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                      "border border-white/18 bg-black/30 text-white shadow-sm backdrop-blur",
                      "transition hover:-translate-y-0.5 active:scale-[0.98]"
                    )}
                  >
                    อ่านเรื่องราวบริษัท <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Years of experience"
                    value={years}
                    suffix="years"
                    icon={<Target className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Brands supported"
                    value={`${brands}+`}
                    suffix="brands"
                    icon={<Building2 className="h-4 w-4" />}
                  />
                  <StatCard
                    label="KA channels"
                    value={`${kaStores}+`}
                    suffix="stores"
                    icon={<Users className="h-4 w-4" />}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/75">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/28 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                    <Warehouse className="h-3.5 w-3.5" />
                    Warehousing network
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/28 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                    <Truck className="h-3.5 w-3.5" />
                    Local logistics
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/28 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    After-sales service
                  </span>
                </div>
              </div>

{/* RIGHT: Hex World Map (7 countries labels, white clean) */}
<div className="relative">
  <div className="mapWrap relative overflow-hidden rounded-[32px] p-6 sm:p-7">
    {/* clean white base */}
    <div className="absolute inset-0 bg-white/92" />
    <div
      className="absolute inset-0 opacity-[0.85]"
      style={{
        background:
          "radial-gradient(680px 420px at 20% 18%, rgba(99,102,241,0.14), transparent 55%)," +
          "radial-gradient(760px 520px at 88% 40%, rgba(34,211,238,0.12), transparent 60%)," +
          "radial-gradient(700px 420px at 36% 92%, rgba(168,85,247,0.10), transparent 60%)",
      }}
    />

    {/* shimmer sweep */}
    <div className="mapSweep pointer-events-none absolute inset-0" />

    <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">Global presence</div>
          <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
            7 key markets connected
          </div>
        </div>

        {/* tiny legend (no boxy frame) */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400/80" />
            Growth
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400/80" />
            Operations
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-fuchsia-400/80" />
            Talent
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mapCanvas relative aspect-[16/10] w-full overflow-hidden rounded-[28px]">
          {/* subtle topographic feel */}
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Hex-map style SVG */}
          <svg
            viewBox="0 0 1100 620"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              {/* soft shadow */}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="rgba(2,6,23,0.14)" />
              </filter>

              {/* hex pattern */}
              <pattern id="hexGrid" width="22" height="19" patternUnits="userSpaceOnUse">
                <path
                  d="M11 0 L22 6 L22 13 L11 19 L0 13 L0 6 Z"
                  fill="rgba(2,6,23,0.03)"
                  stroke="rgba(2,6,23,0.05)"
                  strokeWidth="1"
                />
              </pattern>

              {/* colored speckles (animated via CSS) */}
              <linearGradient id="heatA" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(99,102,241,0.0)" />
                <stop offset="40%" stopColor="rgba(99,102,241,0.22)" />
                <stop offset="60%" stopColor="rgba(34,211,238,0.20)" />
                <stop offset="100%" stopColor="rgba(168,85,247,0.0)" />
              </linearGradient>

              {/* mask for “continents” silhouettes (best-effort) */}
              <mask id="worldMask">
                <rect width="1100" height="620" fill="black" />
                {/* Americas */}
                <path
                  d="M160 150c70-60 140-78 198-52 40 18 62 56 54 92-10 48-60 68-96 88-36 20-52 54-38 86 16 38 62 46 96 54 40 10 74 26 92 54 24 36 8 80-34 96-60 22-140-4-204-46-62-40-108-100-124-164-18-70 2-134 64-198z"
                  fill="white"
                />
                <path
                  d="M320 360c50-34 110-36 154-10 38 24 48 70 22 106-26 38-84 56-134 54-50-2-92-24-104-58-12-34 10-70 62-92z"
                  fill="white"
                />
                {/* Europe/Africa */}
                <path
                  d="M560 160c54-44 118-56 168-28 34 20 50 54 38 84-12 30-46 46-78 56-38 12-66 30-64 60 2 34 46 42 76 50 44 12 72 32 78 62 8 42-28 76-86 86-68 12-144-18-198-70-58-56-82-122-62-180 16-44 62-70 128-120z"
                  fill="white"
                />
                {/* Asia/Oceania */}
                <path
                  d="M760 170c66-40 150-44 208-6 46 30 58 82 26 120-30 36-84 48-130 58-54 12-84 40-74 74 10 38 60 50 108 54 52 4 92 22 104 54 14 38-22 74-88 88-78 16-170-10-236-64-62-50-86-120-56-178 20-40 72-56 138-100z"
                  fill="white"
                />
                <path
                  d="M910 430c34-22 78-24 106-6 22 14 26 38 10 56-16 18-44 24-68 28-28 4-44 18-40 34 4 18 30 24 54 26 26 2 46 10 52 24 8 18-10 34-42 40-38 8-82-4-114-30-30-24-40-56-26-82 10-16 34-22 68-40z"
                  fill="white"
                />
              </mask>
            </defs>

            {/* base hex grid */}
            <rect x="0" y="0" width="1100" height="620" fill="url(#hexGrid)" />

            {/* world area */}
            <g filter="url(#softShadow)">
              <rect
                x="70"
                y="80"
                width="960"
                height="470"
                rx="36"
                fill="rgba(255,255,255,0.78)"
              />
              <rect
                x="70"
                y="80"
                width="960"
                height="470"
                rx="36"
                fill="url(#hexGrid)"
                opacity="0.9"
              />

              {/* continents filled by hex grid via mask */}
              <g mask="url(#worldMask)">
                <rect x="0" y="0" width="1100" height="620" fill="url(#hexGrid)" />
                <rect className="heatBand" x="-260" y="0" width="520" height="620" fill="url(#heatA)" />
              </g>

              {/* connection lines (soft, no boxes) */}
              <g fill="none" stroke="rgba(15,23,42,0.18)" strokeWidth="2" strokeLinecap="round">
                {/* Thailand -> Vietnam -> Philippines */}
                <path className="linkDash" d="M760 310 C 780 300, 810 290, 835 305" />
                <path className="linkDash" d="M835 305 C 860 320, 890 330, 920 320" />
                {/* China -> Vietnam */}
                <path className="linkDash" d="M800 240 C 820 250, 800 280, 770 300" />
                {/* Brazil -> Mexico */}
                <path className="linkDash" d="M330 410 C 290 360, 250 320, 210 290" />
                {/* Mexico -> USA-ish (decor) */}
                <path className="linkDash" d="M210 290 C 230 260, 250 245, 280 230" />
              </g>

              {/* nodes (7) */}
              <g>
                {[
                  { x: 760, y: 310, name: "Thailand" },
                  { x: 800, y: 240, name: "China" },
                  { x: 720, y: 360, name: "Indonesia" },
                  { x: 920, y: 320, name: "Philippines" },
                  { x: 835, y: 305, name: "Vietnam" },
                  { x: 330, y: 410, name: "Brazil" },
                  { x: 210, y: 290, name: "Mexico" },
                ].map((p, i) => (
                  <g key={i} className="mapNode">
                    <circle cx={p.x} cy={p.y} r="10" fill="rgba(99,102,241,0.16)" />
                    <circle cx={p.x} cy={p.y} r="5.5" fill="rgba(15,23,42,0.85)" />
                    <circle cx={p.x} cy={p.y} r="3.2" fill="rgba(255,255,255,0.95)" />
                  </g>
                ))}
              </g>

              {/* country labels (no square box) */}
              <g fontFamily="ui-sans-serif, system-ui" fontSize="13" fontWeight="700" fill="rgba(15,23,42,0.88)">
                <text x="778" y="302">Thailand</text>
                <text x="820" y="233">China</text>
                <text x="740" y="382">Indonesia</text>
                <text x="938" y="315">Philippines</text>
                <text x="855" y="300">Vietnam</text>
                <text x="350" y="430">Brazil</text>
                <text x="228" y="285">Mexico</text>
              </g>
            </g>
          </svg>

          {/* soft edge fade */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 520px at 50% 30%, transparent 40%, rgba(255,255,255,0.78) 100%)",
            }}
          />
        </div>

        {/* bottom hint chips (clean) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-200">
            Thailand • China • Indonesia • Philippines • Vietnam • Brazil • Mexico
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-200">
            Always connected, always moving
          </span>
        </div>
      </div>
    </div>

    <style>{`
      .mapWrap{
        box-shadow: 0 26px 90px rgba(2,6,23,0.16);
      }

      /* sweeping shimmer like the sample */
      .mapSweep{
        background: linear-gradient(120deg,
          transparent 0%,
          rgba(255,255,255,0.00) 22%,
          rgba(255,255,255,0.46) 45%,
          rgba(255,255,255,0.00) 68%,
          transparent 100%);
        transform: translateX(-55%);
        animation: map-sweep 7.2s ease-in-out infinite;
        opacity: .55;
        filter: blur(0.4px);
        mix-blend-mode: soft-light;
      }
      @keyframes map-sweep{
        0%   { transform: translateX(-60%); opacity: .30; }
        50%  { transform: translateX(8%);   opacity: .70; }
        100% { transform: translateX(62%);  opacity: .30; }
      }

      /* animated colored band over hex “continents” */
      .heatBand{
        animation: heat-move 6.5s ease-in-out infinite;
        opacity: .9;
        mix-blend-mode: multiply;
      }
      @keyframes heat-move{
        0% { transform: translateX(-160px); opacity: .55; }
        50% { transform: translateX(860px); opacity: .95; }
        100% { transform: translateX(1240px); opacity: .55; }
      }

      /* dotted moving links */
      .linkDash{
        stroke-dasharray: 8 10;
        animation: dash 2.9s linear infinite;
        opacity: .75;
      }
      @keyframes dash{
        to { stroke-dashoffset: -40; }
      }

      /* node pulse */
      .mapNode{
        transform-origin: center;
        animation: nodePulse 2.4s ease-in-out infinite;
      }
      .mapNode:nth-child(2){ animation-delay: .25s; }
      .mapNode:nth-child(3){ animation-delay: .55s; }
      .mapNode:nth-child(4){ animation-delay: .9s; }
      .mapNode:nth-child(5){ animation-delay: 1.2s; }
      .mapNode:nth-child(6){ animation-delay: 1.45s; }
      .mapNode:nth-child(7){ animation-delay: 1.7s; }

      @keyframes nodePulse{
        0%,100% { opacity: .72; filter: drop-shadow(0 0 0 rgba(15,23,42,0)); }
        50% { opacity: 1; filter: drop-shadow(0 0 18px rgba(99,102,241,0.30)); }
      }
    `}</style>
  </div>
</div>
            </div>
          </div>
        </section>
      </BgSection>
        {/* ✅ Apps section (bg image, no frame) */}
        <BgSection bg="/images/about/apps.jpg" overlay="light" className="py-2">
          <AppsWall images={officeWallImages} />
        </BgSection>

        {/* STORY (bg image) */}
        <BgSection id="story" bg="/images/about/story.jpg" overlay="light" className="py-2">
          <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
            <SectionHeader
              kicker="OUR STORY"
              icon={<Compass className="h-4 w-4" />}
              title="เรื่องราวของ SHD"
              desc="จากเซินเจิ้นสู่การสร้างเครื่องยนต์การเติบโตในอาเซียน — ที่ทำให้แบรนด์ไปได้ไกลและยั่งยืน"
            />

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {storyBlocks.map((b) => (
                <div key={b.title} className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
                  <div className="text-sm font-black text-slate-950">{b.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{b.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <FeatureCard
                icon={<Warehouse className="h-6 w-6 text-emerald-700" />}
                title="โครงสร้างพื้นฐานครบวงจร"
                desc="เครือข่ายคลังสินค้า + โลจิสติกส์ท้องถิ่น + ศูนย์บริการหลังการขาย เพื่อให้แบรนด์ส่งมอบประสบการณ์ที่ดีได้จริง"
              />
              <FeatureCard
                icon={<Sparkles className="h-6 w-6 text-emerald-700" />}
                title="ระบบ OMO + Digital Marketing"
                desc="เชื่อมออนไลน์และออฟไลน์ พร้อมระบบการตลาดดิจิทัลที่สั่งสมมานานหลายปี เพื่อบุกตลาดได้แม่นยำ"
              />
            </div>
          </div>
        </BgSection>

        {/* MISSION / VISION (bg image) */}
        <BgSection bg="/images/about/mission.jpg" overlay="light" className="py-2">
          <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50/80 ring-1 ring-emerald-200 backdrop-blur">
                    <HeartHandshake className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">MISSION</div>
                    <div className="mt-1 text-lg font-black text-slate-950">พันธกิจของเรา</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{mission}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50/80 ring-1 ring-amber-200 backdrop-blur">
                    <Globe2 className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">VISION</div>
                    <div className="mt-1 text-lg font-black text-slate-950">วิสัยทัศน์ของเรา</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{vision}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </BgSection>

        {/* WHO WE ARE (bg image) */}
        <BgSection bg="/images/about/culture.jpg" overlay="light" className="py-2">
          <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
            <SectionHeader
              kicker="WHO WE ARE"
              icon={<Users className="h-4 w-4" />}
              title="ความเป็นเรา"
              desc="นิยามว่าเราคือใคร — สื่อสารอย่างไร ทำงานอย่างไร และตอบสนองต่อสถานการณ์ต่าง ๆ อย่างไร"
              align="center"
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {whoWeAre.map((x) => (
                <div key={x.title} className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur">
                      {x.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950">{x.title}</div>
                      <div className="mt-1 text-sm leading-relaxed text-slate-700">{x.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-[980px] rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50/80 ring-1 ring-emerald-200 backdrop-blur">
                  <Sparkles className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-950">Core principle</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-700">
                    เราเชื่อใน “ชนะไปด้วยกันและเติบโตไปด้วยกัน” เพราะการสร้างคุณค่าที่ยั่งยืนต้องเกิดจากทีมที่ร่วมมือกันจริง
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BgSection>

        {/* JOURNEY (bg image) */}
        <BgSection bg="/images/about/journey.jpg" overlay="light" className="py-2">
          <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
            <SectionHeader
              kicker="OUR JOURNEY"
              icon={<Rocket className="h-4 w-4" />}
              title="เส้นทางการเติบโต"
              desc="จากการเริ่มต้น สู่การสร้างโมเดล Co-Brand Building และระบบที่พาแบรนด์โตในอาเซียน"
              align="center"
            />
            <Timeline items={journey} />
          </div>
        </BgSection>

        {/* AWARDS (bg image) */}
        <BgSection bg="/images/about/awards.jpg" overlay="light" className="py-2">
          <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
            <SectionHeader
              kicker="AWARDS & RECOGNITION"
              icon={<Award className="h-4 w-4" />}
              title="รางวัลและเกียรติยศของแบรนด์"
              desc="บทพิสูจน์จากการทำงานร่วมกับพาร์ทเนอร์และแพลตฟอร์มในหลายประเทศ"
            />

            <div className="mt-8 grid gap-3 lg:grid-cols-2">
              {awards.map((a, i) => (
                <div key={`${a.year}-${i}`} className="rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">{a.year}</span>
                        <div className="text-sm font-black text-slate-950">{a.title}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{a.org}</div>
                    </div>
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "bg-slate-950 text-white shadow-[0_18px_70px_rgba(15,23,42,0.18)]",
                  "transition hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                Explore open roles <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "border border-slate-200 bg-white/80 text-slate-800 shadow-sm backdrop-blur",
                  "transition hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                Back to top <ChevronRight className="h-4 w-4 rotate-[-90deg]" />
              </button>
            </div>

            <div className="h-4" />
          </div>
        </BgSection>

        <div className="h-10" />
      </div>
    </>
  );
}