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

/** ✅ Section with image/video background (everything floats above) */
function BgSection({
  id,
  bg,
  bgVideo,
  poster,
  className,
  children,
  overlay = "light",
  topFade = true,
  bottomFade = true,
}: {
  id?: string;
  bg?: string;
  bgVideo?: string;
  poster?: string;
  className?: string;
  children: React.ReactNode;
  overlay?: "light" | "dark";
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
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
          />
        )}

        {/* ✅ NO black cover — keep it clean & airy */}
        {overlay === "light" ? (
          <>
            <div className="absolute inset-0 bg-white/40" />
            <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_20%_10%,rgba(251,191,36,0.18),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_75%_80%,rgba(16,185,129,0.14),transparent_58%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-slate-950/35" />
            <div className="absolute inset-0 bg-[radial-gradient(1000px_520px_at_20%_15%,rgba(56,189,248,0.14),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(1100px_540px_at_70%_75%,rgba(34,197,94,0.12),transparent_58%)]" />
          </>
        )}

        {topFade ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/65 to-transparent" />
        ) : null}
        {bottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/65 to-transparent" />
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

/** ✅ New: network dots + country labels + fiber lines (NO frame, no map card) */
function NetworkMesh({
  title = "Global Network",
  subtitle = "Connected operations across regions",
}: {
  title?: string;
  subtitle?: string;
}) {
  const reduced = usePrefersReducedMotion();

  const points = useMemo(
    () => [
      { x: 72, y: 44, name: "China" },
      { x: 64, y: 56, name: "Thailand" },
      { x: 58, y: 72, name: "Indonesia" },
      { x: 80, y: 60, name: "Vietnam" },
      { x: 86, y: 66, name: "Philippines" },
      { x: 28, y: 74, name: "Mexico" },
      { x: 34, y: 86, name: "Brazil" },
    ],
    []
  );

  const links = useMemo(
    () => [
      ["China", "Thailand"],
      ["Thailand", "Vietnam"],
      ["Vietnam", "Philippines"],
      ["Thailand", "Indonesia"],
      ["Mexico", "Brazil"],
      ["Thailand", "Mexico"],
    ],
    []
  );

  const find = (name: string) => points.find((p) => p.name === name)!;

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-700">{title}</div>
          <div className="mt-1 text-lg font-black tracking-tight text-slate-950">{subtitle}</div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-slate-800 ring-1 ring-slate-200/70 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          Live links
        </span>
      </div>

      <div className="relative mt-4 aspect-[16/10] w-full">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="fiber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(15,23,42,0)" />
              <stop offset="50%" stopColor="rgba(15,23,42,0.22)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0)" />
            </linearGradient>

            <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="0.7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g fill="none" stroke="url(#fiber)" strokeWidth="0.6" strokeLinecap="round">
            {links.map(([a, b], i) => {
              const A = find(a);
              const B = find(b);
              const mx = (A.x + B.x) / 2;
              const my = (A.y + B.y) / 2;
              const cx = mx + (A.y < B.y ? 6 : -6);
              const cy = my + (A.x < B.x ? -4 : 4);
              return (
                <path
                  key={i}
                  className="nmDash"
                  d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`}
                  opacity="0.95"
                />
              );
            })}
          </g>

          <g fontFamily="ui-sans-serif, system-ui">
            {points.map((p) => (
              <g key={p.name} className="nmNode" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                <circle cx={p.x} cy={p.y} r="2.2" fill="rgba(16,185,129,0.16)" />
                <circle cx={p.x} cy={p.y} r="1.05" fill="rgba(15,23,42,0.90)" filter="url(#softGlow)" />
                <circle cx={p.x} cy={p.y} r="0.55" fill="rgba(255,255,255,0.95)" />
                <text
                  x={p.x + 2.8}
                  y={p.y - 1.8}
                  fontSize="3.2"
                  fontWeight="800"
                  fill="rgba(15,23,42,0.88)"
                >
                  {p.name}
                </text>
              </g>
            ))}
          </g>
        </svg>

        <style>{`
          .nmDash{
            stroke-dasharray: 2.2 2.6;
            ${reduced ? "" : "animation: nm-dash 3.2s linear infinite;"}
          }
          @keyframes nm-dash{
            to { stroke-dashoffset: -18; }
          }
          .nmNode{
            ${reduced ? "" : "animation: nm-pulse 2.6s ease-in-out infinite;"}
            opacity: .9;
          }
          .nmNode:nth-child(2){ animation-delay: .2s; }
          .nmNode:nth-child(3){ animation-delay: .45s; }
          .nmNode:nth-child(4){ animation-delay: .75s; }
          .nmNode:nth-child(5){ animation-delay: 1.05s; }
          .nmNode:nth-child(6){ animation-delay: 1.25s; }
          .nmNode:nth-child(7){ animation-delay: 1.5s; }

          @keyframes nm-pulse{
            0%,100% { opacity: .72; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-200/70 backdrop-blur">
          China • Thailand • Indonesia • Vietnam • Philippines • Mexico • Brazil
        </span>
        <span className="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-200/70 backdrop-blur">
          Fiber network collaboration
        </span>
      </div>
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
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              OUR OFFICES
            </span>

            <h3 className="appsTitle mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h3>

            <p className="appsDesc mt-3 max-w-[60ch] text-sm leading-relaxed text-slate-800">{desc}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-700" />
          </div>

          <div className="space-y-4">
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

          .appsLane{ border-radius:0; padding:0; background:transparent; border:none; backdrop-filter:none; box-shadow:none; }

          .laneGlow{
            width:160px;
            height:120px;
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
        {/* HERO (✅ video bg + NO black cover + ✅ replace map with network dots) */}
        <BgSection
          bgVideo="/videos/about/hero.mp4"
          poster="/images/about/hero.jpg"
          className="pb-4"
          overlay="light"
        >
          <section ref={(n) => (hero.ref.current = n)} onMouseMove={hero.onMove} className={cn("relative")}>
            {/* spotlight */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 md:opacity-100"
              style={{
                background:
                  "radial-gradient(520px 360px at var(--mx, 50%) var(--my, 30%), rgba(15,23,42,0.10), rgba(15,23,42,0.05) 45%, transparent 72%)",
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
                    <Pill icon={<Globe2 className="h-4 w-4" />}>Global • Localization • Growth</Pill>
                    <Pill icon={<Truck className="h-4 w-4" />} tone="good">
                      OMO & Operations
                    </Pill>
                  </div>

                  <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
                    SHD Technology
                    <span className="block text-white/80">จากเซินเจิ้น สู่การเติบโตในอาเซียน</span>
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
                      onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                        "border border-white/18 bg-white/10 text-white shadow-sm backdrop-blur",
                        "transition hover:-translate-y-0.5 active:scale-[0.98]"
                      )}
                    >
                      อ่านเรื่องราวบริษัท <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <StatCard label="Years of experience" value={years} suffix="years" icon={<Target className="h-4 w-4" />} />
                    <StatCard label="Brands supported" value={`${brands}+`} suffix="brands" icon={<Building2 className="h-4 w-4" />} />
                    <StatCard label="KA channels" value={`${kaStores}+`} suffix="stores" icon={<Users className="h-4 w-4" />} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/75">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                      <Warehouse className="h-3.5 w-3.5" />
                      Warehousing network
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                      <Truck className="h-3.5 w-3.5" />
                      Local logistics
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/14 backdrop-blur">
                      <HeartHandshake className="h-3.5 w-3.5" />
                      After-sales service
                    </span>
                  </div>
                </div>

                {/* RIGHT: ✅ remove the big map card; use free network dots + labels */}
                <div className="relative">
                  <NetworkMesh />
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
                <div
                  key={b.title}
                  className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur"
                >
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
                <div
                  key={x.title}
                  className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur"
                >
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
                <div
                  key={`${a.year}-${i}`}
                  className="rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                          {a.year}
                        </span>
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