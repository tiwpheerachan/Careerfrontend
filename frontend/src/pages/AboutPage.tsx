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

/** ✅ Section with image/video background (everything floats above)
 *  ✅ Requested update: background only, no cover/scrim/blur overlays
 */
function BgSection({
  id,
  bg,
  bgVideo,
  poster,
  className,
  children,
  topFade = false,
  bottomFade = false,
}: {
  id?: string;
  bg?: string;
  bgVideo?: string;
  poster?: string;
  className?: string;
  children: React.ReactNode;
  topFade?: boolean;
  bottomFade?: boolean;
}) {
  return (
    <section id={id} className={cn("relative isolate overflow-hidden", className)}>
      {/* background */}
      <div className="absolute inset-0 -z-10">
        {bgVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster}
          >
            <source src={bgVideo} type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
        )}

        {/* ✅ NO overlays, NO blur, NO cover */}
        {topFade ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/30 to-transparent" />
        ) : null}
        {bottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/30 to-transparent" />
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
  frame = true,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  icon?: React.ReactNode;
  frame?: boolean;
}) {
  return (
    <div
      className={cn(
        frame
          ? "rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur"
          : "px-1 py-0" // ✅ no frame (avoid double border)
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700/90">{label}</div>
        {icon ? (
          <div className="text-slate-700/90">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
        {suffix ? <div className="text-sm font-semibold text-slate-600/80">{suffix}</div> : null}
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
  // ✅ shorter (one line)
  desc = "A living wall of our offices.",
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

  // ✅ typewriter (run once) — now types the TITLE (no OUR OFFICES)
  const [typedTitle, setTypedTitle] = useState(reduced ? title : "");
  useEffect(() => {
    if (reduced) return;
    const full = title || "";
    setTypedTitle("");
    let i = 0;
    const t = window.setInterval(() => {
      i++;
      setTypedTitle(full.slice(0, i));
      if (i >= full.length) window.clearInterval(t);
    }, 34);
    return () => window.clearInterval(t);
  }, [reduced, title]);

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
      {/* ✅ stronger white fade on both sides (thicker / darker) */}
      <div className="laneFade laneFadeL pointer-events-none absolute left-0 top-0 h-full" />
      <div className="laneFade laneFadeR pointer-events-none absolute right-0 top-0 h-full" />

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
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} />
      </div>

      <div
        ref={wrapRef}
        className={cn("appsWrap mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12", paused && "paused")}
        onMouseEnter={() => pauseNow()}
        onMouseMove={(e) => {
          pauseNow();
          setSpot(e);
        }}
        onMouseLeave={() => resumeLater(260)}
        onWheel={() => {
          pauseNow();
          resumeLater(520);
        }}
      >
        <div className="appsSpot pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 md:opacity-100" />

        <div className="relative grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            {/* ✅ removed OUR OFFICES completely */}

            {/* ✅ title types here */}
            <h3 className="appsTitle mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              <span className="tType">
                {typedTitle}
                {!reduced && typedTitle.length < (title?.length ?? 0) ? <span className="tCaret" aria-hidden="true" /> : null}
              </span>
            </h3>

            {/* ✅ one-line description */}
            <p className="appsDesc mt-2 max-w-[60ch] text-sm leading-relaxed text-slate-800">{desc}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-700" />
          </div>

          {/* ✅ tighter spacing between top row 1 & 2 */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="w-full max-w-[760px]">{mkTrack("top1", rows.top1, "l")}</div>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-[760px]">{mkTrack("top2", rows.top2, "r")}</div>
            </div>
          </div>
        </div>

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

          .appsTitle, .appsDesc{ text-shadow:none; }

          .appsSpot{
            background:
              radial-gradient(560px 420px at var(--mx,50%) var(--my,40%),
                rgba(255,255,255,0.22),
                rgba(255,255,255,0.10) 42%,
                transparent 74%);
          }

          /* ✅ typewriter caret for TITLE */
          .tType{ display:inline-flex; align-items:center; gap: 8px; }
          .tCaret{
            width: 10px;
            height: 18px;
            border-radius: 2px;
            background: rgba(15,23,42,0.70);
            animation: t-blink 0.9s steps(2, end) infinite;
          }
          @keyframes t-blink{ 0%,49%{opacity:1} 50%,100%{opacity:0} }

          .appsLane{
            border-radius:0;
            padding:0;
            background:transparent;
            border:none;
            backdrop-filter:none;
            box-shadow:none;
          }

          /* ✅ white fade on both sides (each row) — thicker / stronger */
          .laneFade{
            width: 140px;
            height: 100%;
            z-index: 5;
            opacity: .98;
            filter: blur(2.2px);
          }
          .laneFadeL{
            background: linear-gradient(to right,
              rgba(255,255,255,0.995),
              rgba(255,255,255,0.84) 18%,
              rgba(255,255,255,0.46) 52%,
              rgba(255,255,255,0.00) 100%);
          }
          .laneFadeR{
            background: linear-gradient(to left,
              rgba(255,255,255,0.995),
              rgba(255,255,255,0.84) 18%,
              rgba(255,255,255,0.46) 52%,
              rgba(255,255,255,0.00) 100%);
          }
          @media (max-width: 640px){
            .laneFade{ width: 96px; filter: blur(2px); }
          }

          /* ✅ stronger gradient "line" on each lane (like a rail) */
          .appsLane::after{
            content:"";
            position:absolute;
            left: 14px;
            right: 14px;
            bottom: -8px;
            height: 3px;
            border-radius: 999px;
            background: linear-gradient(90deg,
              rgba(251,191,36,0.40),
              rgba(16,185,129,0.30),
              rgba(56,189,248,0.40));
            opacity: .95;
            pointer-events:none;
          }

          .appsTrack{
            display:flex;
            gap: 12px;
            width:max-content;
            will-change: transform;
            padding: 0;
            animation-duration: 85s;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          .appsLeft{ animation-name: apps-marquee-left; }
          .appsRight{ animation-name: apps-marquee-right; }

          @media (prefers-reduced-motion: reduce){
            .appsTrack{ animation:none !important; transform:none !important; }
            .appsSpot{ display:none; }
            .tCaret{ display:none; }
          }
          ${reduced ? ".appsTrack{ animation:none !important; transform:none !important; }" : ""}

          .appsWrap.paused .appsTrack{ animation-play-state: paused; }

          @keyframes apps-marquee-left{ 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
          @keyframes apps-marquee-right{ 0%{transform:translateX(-50%);} 100%{transform:translateX(0);} }

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

const reduced = usePrefersReducedMotion();
const [typedHeroTitle, setTypedHeroTitle] = useState(reduced ? "SHD Technology" : "");

useEffect(() => {
  if (reduced) return;
  const full = "SHD Technology";
  setTypedHeroTitle("");
  let i = 0;
  const t = window.setInterval(() => {
    i++;
    setTypedHeroTitle(full.slice(0, i));
    if (i >= full.length) window.clearInterval(t);
  }, 46); // ปรับความเร็วพิมพ์ได้
  return () => window.clearInterval(t);
}, [reduced]);

  const officeWallImages = useMemo(() => {
    const many: Array<{ src: string; alt?: string }> = [];
    for (let i = 1; i <= 120; i++) many.push({ src: `/images/offices/f${i}.png`, alt: `Office ${i}` });
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

  // ✅ office wall title/desc (keep your component behavior; only text)
  const appsTitle = "Our Offices";
  const appsDesc = "A living wall of our offices.";

  // ✅ HERO parallax (mouse move) — subtle, no blur/cover

  const heroParallaxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (reduced) return;
    const el = heroParallaxRef.current;
    if (!el) return;

    let raf = 0;
    let tx = 0,
      ty = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      tx = px * 10; // max 10px
      ty = py * 10;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--hx", `${tx.toFixed(2)}px`);
        el.style.setProperty("--hy", `${ty.toFixed(2)}px`);
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [reduced]);

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
        {/* HERO (✅ background pure, no overlay/blur/cover; ✅ colors updated; ✅ remove Global network) */}
        <BgSection bgVideo="/videos/about/hero.mp4" poster="/images/about/hero.jpg" className="pb-4">
          <section className="relative">
            <div
              ref={heroParallaxRef}
              className="relative will-change-transform"
              style={{ transform: "translate3d(var(--hx,0px), var(--hy,0px), 0)" }}
            >
              <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 pt-14 pb-8 sm:pt-16 sm:pb-10">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                  {/* LEFT */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-extrabold text-slate-900 ring-1 ring-slate-900/10 shadow-sm backdrop-blur">
                        <Sparkles className="h-4 w-4" />
                        Company Story
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-900/10 shadow-sm backdrop-blur">
                        <Globe2 className="h-4 w-4" />
                        Global • Localization • Growth
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-xs font-bold text-slate-800 ring-1 ring-slate-900/10 shadow-sm backdrop-blur">
                        <Truck className="h-4 w-4" />
                        OMO & Operations
                      </span>
                    </div>

                    {/* ✅ color changes */}
                    <h1 className="mt-6 text-4xl font-black tracking-tight text-[#4b2e1f] sm:text-6xl">
                      SHD Technology
                      <span className="mt-2 block text-2xl font-black tracking-tight text-black sm:text-4xl">
                        ความเป็นเลิศที่ส่งมอบได้จริง
                      </span>
                    </h1>

                    {/* ✅ updated sentence + color */}
                    <p className="mt-4 max-w-[78ch] text-base leading-relaxed text-[#4b2e1f] sm:text-lg">
                      เรามุ่งเน้นคุณภาพตั้งแต่ต้นทางถึงปลายทาง เพื่อให้ทุกประสบการณ์ของลูกค้า “ชัดเจนและมั่นใจ”
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Link
                        to="/jobs"
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                          "bg-slate-950 text-white shadow-[0_18px_70px_rgba(2,6,23,0.22)]",
                          "transition hover:-translate-y-0.5 hover:shadow-[0_28px_110px_rgba(2,6,23,0.26)] active:scale-[0.98]"
                        )}
                      >
                        ดูตำแหน่งงานทั้งหมด <ArrowRight className="h-4 w-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                          "bg-white/75 text-slate-900 ring-1 ring-slate-900/10 shadow-sm backdrop-blur",
                          "transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]"
                        )}
                      >
                        อ่านเรื่องราวบริษัท <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

{/* ✅ stats — glass blur (no double frame) */}
<div className="mt-7 grid gap-3 sm:grid-cols-3">
  {[
    {
      label: "Years of experience",
      value: years,
      suffix: "years",
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Brands supported",
      value: `${brands}+`,
      suffix: "brands",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "KA channels",
      value: `${kaStores}+`,
      suffix: "stores",
      icon: <Users className="h-4 w-4" />,
    },
  ].map((s) => (
    <div
      key={s.label}
      className={cn(
        "group relative overflow-hidden rounded-3xl p-4",
        // ✅ glass
        "bg-white/28 backdrop-blur-xl",
        // ✅ soft edge (not a hard border)
        "ring-1 ring-white/45",
        // ✅ depth
        "shadow-[0_18px_70px_rgba(15,23,42,0.10)]",
        // ✅ hover lift (subtle)
        "transition hover:-translate-y-0.5 hover:shadow-[0_28px_110px_rgba(15,23,42,0.14)]"
      )}
    >
      {/* ✅ glossy highlight (no extra frame) */}
      <div className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full bg-white/35 blur-2xl opacity-80" />
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-white/25 blur-3xl opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-80" />

      <div className="relative">
        <StatCard
          label={s.label}
          value={s.value}
          suffix={s.suffix}
          icon={s.icon}
          frame={false} // ✅ important: stop inner border/bg
        />
      </div>
    </div>
  ))}
</div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-900/10 backdrop-blur">
                        <Warehouse className="h-3.5 w-3.5" />
                        Warehousing
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-900/10 backdrop-blur">
                        <Truck className="h-3.5 w-3.5" />
                        Local logistics
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-900/10 backdrop-blur">
                        <HeartHandshake className="h-3.5 w-3.5" />
                        After-sales service
                      </span>
                    </div>
                  </div>

                  {/* RIGHT (✅ removed Global network completely) */}
                  <div className="hidden lg:block" />
                </div>
              </div>
            </div>

            {/* ✅ subtle parallax easing */}
            <style>{`
              @media (prefers-reduced-motion: reduce){
                [style*="--hx"]{ transform:none !important; }
              }
            `}</style>
          </section>
        </BgSection>

        {/* ✅ Apps section (bg image, no frame) */}
        <BgSection bg="/images/about/apps.jpg" className="py-2">
          <AppsWall title={appsTitle} desc={appsDesc} images={officeWallImages} />
        </BgSection>

        {/* STORY (bg image) */}
        <BgSection id="story" bg="/images/about/story.jpg" className="py-2">
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
        <BgSection bg="/images/about/mission.jpg" className="py-2">
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
        <BgSection bg="/images/about/culture.jpg" className="py-2">
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
        <BgSection bg="/images/about/journey.jpg" className="py-2">
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

 {/* AWARDS (mosaic grid — clean, no gradients, Highlights supports VIDEO) */}
<BgSection bg="/images/about/awards.jpg" className="py-2">
  <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
    <SectionHeader
      kicker="AWARDS & RECOGNITION"
      icon={<Award className="h-4 w-4" />}
      title="รางวัลและเกียรติยศของแบรนด์"
      desc="บทพิสูจน์จากการทำงานร่วมกับพาร์ทเนอร์และแพลตฟอร์มในหลายประเทศ"
    />

    {(() => {
      // a1..a14
      const getImg = (i: number) => `/images/about/awards/a${(i % 14) + 1}.jpg`;

      // ✅ Highlights video path (put this file here)
      const HIGHLIGHTS_VIDEO = "/images/about/awards/video.mp4";

      const total = awards?.length ?? 0;

      const a0 = awards?.[0] ?? { year: "—", title: "Award Highlight", org: "—" };
      const a1 = awards?.[1] ?? a0;
      const a2 = awards?.[2] ?? a0;
      const a3 = awards?.[3] ?? a0;
      const a4 = awards?.[4] ?? a0;
      const a5 = awards?.[5] ?? a0;

      const Tile = ({ className, children }: { className: string; children: React.ReactNode }) => (
        <div className={cn("relative overflow-hidden rounded-3xl", className)}>{children}</div>
      );

      const CornerLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-black text-white">
          {icon}
          {text}
        </div>
      );

      // ✅ Video tile (for Highlights only)
      const VideoTile = ({
        src,
        className,
        label,
      }: {
        src: string;
        className: string;
        label?: string;
      }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          {/* solid overlay only */}
          <div className="absolute inset-0 bg-black/25" />
          {label ? <CornerLabel icon={<Award className="h-3.5 w-3.5" />} text={label} /> : null}
        </Tile>
      );

      const ImgTile = ({
        src,
        className,
        label,
      }: {
        src: string;
        className: string;
        label?: string;
      }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <img
            src={src}
            alt={label || "award"}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/25" />
          {label ? <CornerLabel icon={<Award className="h-3.5 w-3.5" />} text={label} /> : null}
        </Tile>
      );

      const FlipTile = ({
        aSrc,
        bSrc,
        className,
        label,
        intervalMs = 2600,
      }: {
        aSrc: string;
        bSrc: string;
        className: string;
        label?: string;
        intervalMs?: number;
      }) => {
        const [idx, setIdx] = React.useState<0 | 1>(0);

        React.useEffect(() => {
          const t = window.setInterval(() => setIdx((v) => (v === 0 ? 1 : 0)), intervalMs);
          return () => window.clearInterval(t);
        }, [intervalMs]);

        return (
          <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
            <img
              src={aSrc}
              alt="flip-a"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                idx === 0 ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              draggable={false}
            />
            <img
              src={bSrc}
              alt="flip-b"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                idx === 1 ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/25" />
            {label ? <CornerLabel icon={<Sparkles className="h-3.5 w-3.5" />} text={label} /> : null}
          </Tile>
        );
      };

      const TextTile = ({
        a,
        className,
        bgSrc,
      }: {
        a: { year: string; title: string; org: string; note?: string };
        className: string;
        bgSrc: string;
      }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <img
            src={bgSrc}
            alt="award-bg"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative p-5 sm:p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white">
                {a.year}
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>

            <div className="mt-3 text-sm font-black leading-snug">{a.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-white/85">{a.org}</div>

            {a.note ? <div className="mt-3 text-xs text-white/70">{a.note}</div> : null}
          </div>
        </Tile>
      );

      const StatTile = ({ className, bgSrc }: { className: string; bgSrc: string }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <img
            src={bgSrc}
            alt="stat-bg"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative p-5 sm:p-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
              <Sparkles className="h-3.5 w-3.5" />
              Recognition
            </div>

            <div className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              {Math.max(1, total)}
              <span className="text-white/60">+</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-white/85">Awards across platforms & regions</div>

            <div className="mt-4 text-sm leading-relaxed text-white/80">
              จากการร่วมมืออย่างใกล้ชิดกับแบรนด์และแพลตฟอร์ม เราสร้างผลลัพธ์ที่ “วัดได้จริง” และ “ส่งมอบได้จริง”
            </div>
          </div>
        </Tile>
      );

      // ✅ Unique image plan
      const IMG_F1A = getImg(1);  // a2
      const IMG_F1B = getImg(2);  // a3
      const IMG_STAT = getImg(3); // a4
      const IMG_T0 = getImg(4);   // a5
      const IMG_6 = getImg(5);    // a6
      const IMG_7 = getImg(6);    // a7
      const IMG_8 = getImg(7);    // a8
      const IMG_T1 = getImg(8);   // a9
      const IMG_F2A = getImg(9);  // a10
      const IMG_F2B = getImg(10); // a11

      const IMG_D2 = getImg(11);  // a12
      const IMG_D3 = getImg(12);  // a13
      const IMG_D4 = getImg(13);  // a14

      const IMG_M5 = IMG_D2; // mobile-only

      return (
        <div className="mt-8">
          <div className="grid grid-cols-12 gap-3">
            {/* Row 1 */}
            {/* ✅ Highlights is VIDEO now */}
            <VideoTile className="col-span-12 sm:col-span-4" src={HIGHLIGHTS_VIDEO} label="Highlights" />

            {/* ✅ Flip tile #1 */}
            <FlipTile
              className="col-span-6 sm:col-span-4"
              aSrc={IMG_F1A}
              bSrc={IMG_F1B}
              label="Award Moments"
              intervalMs={2600}
            />

            <StatTile className="col-span-6 sm:col-span-4" bgSrc={IMG_STAT} />

            {/* Row 2 */}
            <TextTile className="col-span-12 lg:col-span-6" a={a0} bgSrc={IMG_T0} />
            <ImgTile className="col-span-6 lg:col-span-3" src={IMG_6} />
            <ImgTile className="col-span-6 lg:col-span-3" src={IMG_7} />

            {/* Row 3 */}
            <ImgTile className="col-span-6 lg:col-span-4" src={IMG_8} />
            <TextTile className="col-span-6 lg:col-span-4" a={a1} bgSrc={IMG_T1} />

            {/* ✅ Flip tile #2 */}
            <FlipTile
              className="col-span-12 lg:col-span-4"
              aSrc={IMG_F2A}
              bSrc={IMG_F2B}
              label="Trusted by partners"
              intervalMs={3000}
            />

            {/* Row 4 (desktop only) */}
            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a2} bgSrc={IMG_D2} />
            </div>
            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a3} bgSrc={IMG_D3} />
            </div>
            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a4} bgSrc={IMG_D4} />
            </div>

            {/* Mobile only */}
            <div className="lg:hidden col-span-12">
              <TextTile className="" a={a5} bgSrc={IMG_M5} />
            </div>
          </div>

          {/* bottom actions */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/jobs"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black text-white",
                "bg-[#C25A2A]",
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
                "bg-white/75 text-slate-900",
                "transition hover:-translate-y-0.5 active:scale-[0.98]"
              )}
            >
              Back to top <ChevronRight className="h-4 w-4 rotate-[-90deg]" />
            </button>
          </div>
        </div>
      );
    })()}

    <div className="h-4" />
  </div>
</BgSection>

        <div className="h-10" />
      </div>
    </>
  );
}