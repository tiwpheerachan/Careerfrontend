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
import { ChevronUp, ChevronDown } from "lucide-react";

function JourneyShowcase({
  items,
  defaultIndex = 0,
}: {
  items: Array<{ year: string; title: string; desc: string; tag?: string }>;
  defaultIndex?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const safe = items?.length ? items : [{ year: "—", title: "—", desc: "—", tag: "—" }];

  const [idx, setIdx] = React.useState(() => {
    const v = Math.max(0, Math.min(safe.length - 1, defaultIndex));
    return v;
  });

  const active = safe[idx];
  const canPrev = idx > 0;
  const canNext = idx < safe.length - 1;

  const prev = () => setIdx((v) => Math.max(0, v - 1));
  const next = () => setIdx((v) => Math.min(safe.length - 1, v + 1));

  // label row (Start / Local / Brand / Co-build / Scale)
  const labels = safe.map((x) => x.tag || `Step ${x.year}`);

  // progress % along the bar
  const progress = safe.length <= 1 ? 0 : (idx / (safe.length - 1)) * 100;

  // year helper for right rail
  const yearAt = (i: number) => safe[i]?.year ?? "—";

  // keyboard nav (optional)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") prev();
      if (e.key === "ArrowDown") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-8">
      <div className="mx-auto w-full max-w-[980px]">
        {/* Step bar */}
        <div className="px-2 sm:px-6">
          <div className="relative">
            {/* labels */}
            <div className="grid grid-cols-5 gap-2 text-[12px] sm:text-sm">
              {labels.map((lb, i) => {
                const activeStep = i === idx;
                return (
                  <button
                    key={`${lb}-${i}`}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={cn(
                      "text-left transition",
                      activeStep ? "text-slate-950 font-semibold" : "text-slate-500 hover:text-slate-700"
                    )}
                    aria-current={activeStep ? "step" : undefined}
                  >
                    {lb}
                  </button>
                );
              })}
            </div>

            {/* rail */}
            <div className="relative mt-2 h-8">
              {/* base line */}
              <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-slate-200" />

              {/* progress line (gradient like screenshot) */}
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(236,72,153,0.42))",
                }}
              />

              {/* dots */}
              <div className="absolute inset-0 flex items-center justify-between">
                {safe.map((_, i) => {
                  const activeDot = i === idx;
                  return (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={cn(
                        "relative grid place-items-center rounded-full transition",
                        activeDot ? "scale-110" : "hover:scale-105"
                      )}
                      aria-label={`Go to ${labels[i]}`}
                    >
                      <span
                        className={cn(
                          "block h-3.5 w-3.5 rounded-full",
                          activeDot
                            ? "bg-amber-500 shadow-[0_10px_24px_rgba(245,158,11,0.35)]"
                            : "bg-amber-500/85"
                        )}
                      />
                      {/* active halo */}
                      {activeDot ? (
                        <span className="pointer-events-none absolute -inset-3 rounded-full bg-amber-500/10" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* content (2 cols like screenshot) */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_220px]">
          {/* LEFT */}
          <div className="px-2 sm:px-6">
            {/* small tag pill (Start) */}
            {active.tag ? (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-5 py-2 text-sm font-semibold text-amber-900">
                  {active.tag}
                </span>
              </div>
            ) : null}

            <div
              className={cn(
                "transition",
                reduced ? "" : "will-change-transform"
              )}
              style={{
                transform: reduced ? undefined : "translateZ(0)",
              }}
            >
              <h3 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {active.title}
              </h3>

              <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-slate-700 sm:text-lg">
                {active.desc}
              </p>

              <div className="mt-6">
                <span className="inline-flex items-center rounded-full bg-fuchsia-100/80 px-5 py-2 text-sm font-semibold text-slate-900">
                  Build • Scale • Global
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: year picker */}
          <div className="px-2 sm:px-6 lg:px-0">
            <div className="mx-auto w-full max-w-[220px]">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={prev}
                  disabled={!canPrev}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-2xl transition",
                    canPrev ? "hover:bg-slate-900/5 active:scale-[0.98]" : "opacity-30 cursor-not-allowed"
                  )}
                  aria-label="Previous year"
                >
                  <ChevronUp className="h-7 w-7 text-slate-900" />
                </button>

                <div className="mt-1 text-center">
                  <div className="text-xl font-semibold text-slate-400">{yearAt(idx - 1)}</div>

                  <div className="mt-2 text-6xl font-black tracking-tight text-slate-950">
                    {active.year}
                  </div>

                  <div className="mt-2 text-xl font-semibold text-slate-300">{yearAt(idx + 1)}</div>
                </div>

                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className={cn(
                    "mt-3 grid h-11 w-11 place-items-center rounded-2xl transition",
                    canNext ? "hover:bg-slate-900/5 active:scale-[0.98]" : "opacity-30 cursor-not-allowed"
                  )}
                  aria-label="Next year"
                >
                  <ChevronDown className="h-7 w-7 text-slate-900" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mobile polish: center year rail under text */}
        <style>{`
          @media (max-width: 1024px){
            /* keep the same clean feel */
          }
        `}</style>
      </div>
    </div>
  );
}

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

/** ---------------------------------------------
 * Typing title (type → pause → delete → loop)
 * วางไว้ในไฟล์เดียวกัน (AboutPage.tsx) ได้เลย
 * --------------------------------------------*/
function TypingTitle({
  text,
  className,
  pauseMs = 900,
  deleteMs = 420,
  typeSpeed = 70,
  deleteSpeed = 45,
}: {
  text: string;
  className?: string;
  pauseMs?: number;
  deleteMs?: number;
  typeSpeed?: number;
  deleteSpeed?: number;
}) {
  const [out, setOut] = React.useState("");
  const [mode, setMode] = React.useState<"typing" | "pause" | "deleting" | "hold">("typing");

  React.useEffect(() => {
    let t: any;

    if (mode === "typing") {
      if (out.length < text.length) {
        t = setTimeout(() => setOut(text.slice(0, out.length + 1)), typeSpeed);
      } else {
        setMode("pause");
      }
    } else if (mode === "pause") {
      t = setTimeout(() => setMode("deleting"), pauseMs);
    } else if (mode === "deleting") {
      if (out.length > 0) {
        t = setTimeout(() => setOut(text.slice(0, out.length - 1)), deleteSpeed);
      } else {
        setMode("hold");
      }
    } else if (mode === "hold") {
      t = setTimeout(() => setMode("typing"), deleteMs);
    }

    return () => clearTimeout(t);
  }, [mode, out, text, pauseMs, deleteMs, typeSpeed, deleteSpeed]);

  return (
    <h2 className={className}>
      {out}
      <span className="caret">|</span>
    </h2>
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
      no: "01",
      title: "เริ่มจากเซินเจิ้น สู่ภารกิจในอาเซียน",
      body:
        "SHD ก่อตั้งขึ้นที่เมืองเซินเจิ้นในปี 2013 และเดินหน้าธุรกิจต่อเนื่องกว่า 12 ปี ด้วยเป้าหมายเดียวคือช่วยให้แบรนด์ “เข้าท้องถิ่นได้จริง” เรานำประสบการณ์เชิงลึกจากอุตสาหกรรมเทคโนโลยี ผสานทีมผู้เชี่ยวชาญข้ามพรมแดน เพื่อพาแบรนด์เริ่มต้นจาก 0→1 อย่างมั่นคง และต่อยอดสู่การเติบโตแบบทำซ้ำได้ในตลาดอาเซียน",
      tag: "Start",
      highlight: "2013 • 12+ ปี • ASEAN-first",
    },
    {
      no: "02",
      title: "ลงทุนโครงสร้างพื้นฐาน เพื่อให้สเกลได้จริง",
      body:
        "เราเชื่อว่าแบรนด์จะโตอย่างยั่งยืนได้ ต้องมี “ระบบหลังบ้าน” ที่แข็งแรง จึงลงทุนสร้างโครงสร้างพื้นฐานครบวงจรด้วยตนเอง ตั้งแต่เครือข่ายคลังสินค้าและโลจิสติกส์ท้องถิ่น ศูนย์บริการหลังการขาย ระบบปฏิบัติการ OMO แบบเต็มรูปแบบ ไปจนถึงการทำงานร่วมกับเครือข่าย KA มากกว่า 1,000 แห่ง และระบบการตลาดดิจิทัลที่สั่งสมประสบการณ์ยาวนาน เพื่อให้การขยายสเกลเกิดขึ้นได้จริงในหลายประเทศ",
      tag: "Infrastructure",
      highlight: "1,000+ KA • OMO • After-sales",
    },
    {
      no: "03",
      title: "เครื่องยนต์ 4 มิติ จาก 0–1 สู่ 1–100",
      body:
        "เราใช้กรอบการทำงาน 4 มิติ: การกำหนดตำแหน่งแบรนด์ → ช่องทาง → การตลาด → การดำเนินงาน เพื่อเร่งการเติบโตอย่างมีทิศทาง ช่วยสนับสนุนแบรนด์อิเล็กทรอนิกส์ผู้บริโภคกว่า 20+ แบรนด์เข้าสู่อาเซียน โดยหลายแบรนด์สามารถขึ้นเป็นอันดับ 1 ในหมวดหมู่บนแพลตฟอร์มภายในปีแรก เป้าหมายของเราไม่ใช่แค่ “ขายได้” แต่คือ “สร้างเครื่องยนต์เติบโต” ที่แบรนด์ใช้ต่อได้ระยะยาว",
      tag: "4D Engine",
      highlight: "20+ แบรนด์ • #1 ในปีแรก",
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
        year: "2014",
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
        year: "2019",
        title: "Co-Brand Building Model",
        desc: "พัฒนาโมเดล “การสร้างแบรนด์ร่วมกัน” สนับสนุนตั้งแต่กำหนดตำแหน่งสินค้า ช่องทาง ไปจนถึงการตลาด",
        tag: "Co-build",
      },
      {
        year: "Now",
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
        <BgSection bg="/videos/about/x50-ultra-banner.webp" className="pb-4">
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

    {(() => {
      // ========= Helpers (inline, keep it self-contained) =========
      const FlipImage = ({
        a,
        b,
        alt,
        intervalMs = 4200,
        className = "",
      }: {
        a: string;
        b: string;
        alt: string;
        intervalMs?: number;
        className?: string;
      }) => {
        const [onA, setOnA] = React.useState(true);
        React.useEffect(() => {
          const t = window.setInterval(() => setOnA((v) => !v), intervalMs);
          return () => window.clearInterval(t);
        }, [intervalMs]);
        return (
          <div className={"relative overflow-hidden border border-slate-200 bg-white " + className}>
            <img
              src={a}
              alt={alt}
              className={
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 " +
                (onA ? "opacity-100" : "opacity-0")
              }
              draggable={false}
            />
            <img
              src={b}
              alt={alt}
              className={
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 " +
                (onA ? "opacity-0" : "opacity-100")
              }
              draggable={false}
            />
            <div className="relative h-full w-full" />
          </div>
        );
      };

      const StepPill = ({ n, active, onClick }: { n: string; active?: boolean; onClick?: () => void }) => (
        <button
          type="button"
          onClick={onClick}
          className={
            "h-7 w-10 border text-[12px] font-black tracking-wide transition " +
            (active
              ? "border-pink-200 bg-pink-100 text-slate-950"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
          }
          aria-pressed={!!active}
        >
          {n}
        </button>
      );

      const Tag = ({ children, tone = "pink" }: { children: React.ReactNode; tone?: "pink" | "amber" }) => (
        <span
          className={
            "inline-flex items-center border px-2.5 py-1 text-[12px] font-black " +
            (tone === "amber"
              ? "border-amber-200 bg-amber-100 text-slate-950"
              : "border-pink-200 bg-pink-100 text-slate-950")
          }
        >
          {children}
        </span>
      );

      const StepNo = ({ children }: { children: React.ReactNode }) => (
        <span className="inline-flex h-7 w-7 items-center justify-center border border-pink-200 bg-pink-100 text-[12px] font-black text-slate-950">
          {children}
        </span>
      );

      // ========= Assets (replace with your real paths) =========
      const HERO_VIDEO = "/videos/shd-story-hero.mp4";

      const IMG_STEP1_A = "/images/about/story/s1a.jpg";
      const IMG_STEP1_B = "/images/about/story/s1b.jpg";

      const IMG_STEP2_A = "/images/about/story/s2a.jpg";
      const IMG_STEP2_B = "/images/about/story/s2b.jpg";

      const IMG_WIDE_A = "/images/about/story/s3wide-a.jpg";
      const IMG_WIDE_B = "/images/about/story/s3wide-b.jpg";

      const IMG_TOWER_A = "/images/about/story/tower-a.jpg";
      const IMG_TOWER_B = "/images/about/story/tower-b.jpg";

      // ========= Copy (tight, story-driven) =========
      const flow = [
        {
          id: "01",
          title: "เริ่มจากเซินเจิ้น สู่ภารกิจในอาเซียน",
          meta: "2013 • 12+ ปี • ASEAN-first",
          tag: { label: "Start", tone: "amber" as const },
          body:
            "SHD ก่อตั้งที่เซินเจิ้นในปี 2013 และมุ่งหน้าเข้าสู่อาเซียนด้วยเป้าหมายเดียว—ทำให้แบรนด์ “เข้าท้องถิ่นได้จริง” เราผสานความเชี่ยวชาญข้ามพรมแดนกับทีมท้องถิ่น เพื่อพาแบรนด์เริ่มต้นจาก 0→1 อย่างมั่นคง และต่อยอดสู่การเติบโตแบบยั่งยืน",
        },
        {
          id: "02",
          title: "ลงทุนโครงสร้างพื้นฐาน เพื่อให้สเกลได้จริง",
          meta: "1,000+ KA • OMO • After-sales",
          tag: { label: "Infrastructure", tone: "pink" as const },
          body:
            "การเติบโตต้องมี “ระบบรองรับ” เราจึงสร้างเครือข่ายคลังสินค้าและโลจิสติกส์ในประเทศ ศูนย์บริการหลังการขาย และระบบปฏิบัติการ OMO ที่เชื่อมออนไลน์–ออฟไลน์ พร้อมเครือข่ายช่องทาง KA กว่า 1,000 แห่ง เพื่อให้แบรนด์ขยายสเกลได้เร็ว แม่นยำ และมีคุณภาพ",
        },
        {
          id: "03",
          title: "เครื่องยนต์ 4 มิติ จาก 0–1 สู่ 1–100",
          meta: "20+ แบรนด์ • #1 ในหมวดหมู่ • ปีแรก",
          tag: { label: "4D Engine", tone: "amber" as const },
          body:
            "เราใช้กรอบทำงาน 4 มิติ: การกำหนดตำแหน่งแบรนด์ → ช่องทาง → การตลาด → การดำเนินงาน เพื่อขับเคลื่อนการเติบโตแบบเป็นระบบ ช่วยสนับสนุนแบรนด์อิเล็กทรอนิกส์ผู้บริโภคกว่า 20+ แบรนด์เข้าสู่อาเซียน โดยหลายแบรนด์ก้าวสู่อันดับ 1 ในหมวดหมู่บนแพลตฟอร์มภายในปีแรก",
        },
      ];

      const [active, setActive] = React.useState<"01" | "02" | "03">("01");

      // ✅ Mobile auto-scroll to the flow panel when user taps 01/02/03
      const flowRef = React.useRef<HTMLDivElement | null>(null);
      const onPickStep = (id: "01" | "02" | "03") => {
        setActive(id);
        // On mobile, scroll to flow panel so the change is visible immediately
        if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023px)")?.matches) {
          window.setTimeout(() => flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }
      };

      return (
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* LEFT: Video hero + stats */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden border border-slate-200 bg-white">
              {/* ✅ responsive heights: mobile taller */}
              <div className="relative w-full h-[360px] sm:h-[420px] lg:aspect-[4/3] lg:h-auto">
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src={HERO_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                {/* ✅ responsive padding + type scale */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <div className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-black text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    From 0→1 to 1→100
                  </div>

                  <div className="mt-3 text-[28px] sm:text-[34px] font-black leading-[1.05] tracking-tight text-white">
                    Build local. Scale fast.
                    <br />
                    Grow sustainable.
                  </div>

                  <div className="mt-2 max-w-[38ch] text-[12px] sm:text-[13px] leading-relaxed text-white/85">
                    ระบบที่ทำให้แบรนด์ “เข้าท้องถิ่นได้จริง” และขยายสเกลได้แบบยาวๆ
                  </div>
                </div>
              </div>

              {/* ✅ stats: same row on mobile but tighter padding */}
              <div className="grid grid-cols-3 gap-0 border-t border-slate-200">
                <div className="p-3 sm:p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Founded</div>
                  <div className="mt-1 text-[14px] font-black text-slate-950">2013</div>
                </div>
                <div className="p-3 sm:p-4 border-l border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">Countries</div>
                  <div className="mt-1 text-[14px] font-black text-slate-950">9</div>
                </div>
                <div className="p-3 sm:p-4 border-l border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">Brands</div>
                  <div className="mt-1 text-[14px] font-black text-slate-950">20+</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Story Flow */}
          <div ref={flowRef} className="lg:col-span-7 scroll-mt-24">
            <div className="border border-slate-200 bg-white">
              {/* ✅ Mobile: chips go to next line, no overflow */}
              <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-black text-slate-700">
                    <span className="h-2 w-2 bg-slate-900" />
                    SHD STORY FLOW
                  </div>

                  <div className="mt-3 text-[22px] sm:text-[28px] font-black leading-[1.12] tracking-tight text-slate-950">
                    ความ”มุ่งมั่น” คือสิ่งที่เราเชื่อถือ
                    <br className="hidden sm:block" />
                    การลงมือทำ คือ บทพิสูจน์
                  </div>

                  <div className="mt-2 text-[12px] font-semibold text-slate-500">
                    วิสัยทัศน์ • การลงมือทำ • การขยายสเกล
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StepPill n="01" active={active === "01"} onClick={() => onPickStep("01")} />
                  <div className="h-px w-6 bg-slate-200" />
                  <StepPill n="02" active={active === "02"} onClick={() => onPickStep("02")} />
                  <div className="h-px w-6 bg-slate-200" />
                  <StepPill n="03" active={active === "03"} onClick={() => onPickStep("03")} />
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {/* ✅ STEP 01: stack on mobile */}
                <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <div className="flex items-start gap-3">
                      <StepNo>01</StepNo>
                      <div className="min-w-0">
                        <div className="text-[16px] sm:text-[18px] font-black text-slate-950">{flow[0].title}</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-slate-500">{flow[0].meta}</div>
                      </div>
                      <div className="ml-auto">
                        <Tag tone={flow[0].tag.tone}>{flow[0].tag.label}</Tag>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{flow[0].body}</p>
                  </div>

                  <div className="lg:col-span-5">
                    <FlipImage
                      a={IMG_STEP1_A}
                      b={IMG_STEP1_B}
                      alt="Story step 01"
                      className="h-[200px] sm:h-[220px] lg:h-[190px]"
                      intervalMs={4200}
                    />
                  </div>
                </div>

                {/* ✅ STEP 02: image becomes full width on mobile */}
                <div className="mt-6 grid gap-4 sm:gap-5 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <FlipImage
                      a={IMG_TOWER_A}
                      b={IMG_TOWER_B}
                      alt="Story step 02 image"
                      className="h-[200px] sm:h-[240px] lg:h-[210px]"
                      intervalMs={4500}
                    />
                  </div>

                  <div className="lg:col-span-8">
                    <div className="flex items-start gap-3">
                      <StepNo>02</StepNo>
                      <div className="min-w-0">
                        <div className="text-[16px] sm:text-[18px] font-black text-slate-950">{flow[1].title}</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-slate-500">{flow[1].meta}</div>
                      </div>
                      <div className="ml-auto">
                        <Tag tone={flow[1].tag.tone}>{flow[1].tag.label}</Tag>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{flow[1].body}</p>
                  </div>
                </div>

                {/* ✅ Wide image */}
                <div className="mt-6">
                  <FlipImage
                    a={IMG_WIDE_A}
                    b={IMG_WIDE_B}
                    alt="Wide story image"
                    className="h-[140px] sm:h-[160px]"
                    intervalMs={4800}
                  />
                </div>

                {/* ✅ STEP 03 */}
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex items-start gap-3">
                    <StepNo>03</StepNo>
                    <div className="min-w-0">
                      <div className="text-[16px] sm:text-[18px] font-black text-slate-950">{flow[2].title}</div>
                      <div className="mt-0.5 text-[12px] font-semibold text-slate-500">{flow[2].meta}</div>
                    </div>
                    <div className="ml-auto">
                      <Tag tone={flow[2].tag.tone}>{flow[2].tag.label}</Tag>
                    </div>
                  </div>

                  <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{flow[2].body}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
  </div>
</BgSection>

{/* MISSION / VISION — Minimal white + orbit (no shadow/blur/gradient) */}
<section className="bg-white py-14">
  <style>{`
    /* ---------- Typography ---------- */
    .mv-kicker{
      display:flex; align-items:center; gap:12px;
      font-size:11px; font-weight:800; letter-spacing:.22em;
      color:#0f172a;
    }
    .mv-kicker::before{
      content:""; display:inline-block; width:44px; height:1px;
      background: rgba(15,23,42,.22);
    }
    .mv-h{
      color:#0f172a;
      font-weight:900;
      letter-spacing:-.02em;
      line-height:1.05;
      font-size:34px;
    }
    @media (min-width: 640px){ .mv-h{ font-size:42px; } }
    .mv-p{
      color: rgba(15,23,42,.72);
      font-size:14px;
      line-height:1.75;
    }

    /* ---------- Orbit Stage ---------- */
    .orbitWrap{
      position:relative;
      width: clamp(320px, 42vw, 520px);
      aspect-ratio: 1 / 1;
      margin-left:auto;
      margin-right:auto;
      transform: translateX(-16px); /* ✅ keep your balance shift */
      container-type: size;         /* ✅ enables cqw/cqh for perfect radius matching */
    }
    @media (max-width: 1024px){
      .orbitWrap{ transform: translateX(0); }
    }

    /* ---------- Rings (SVG) ---------- */
    .orbitSvg{
      position:absolute; inset:0;
      width:100%; height:100%;
      pointer-events:none;
    }
    .ringStroke{
      fill:none;
      stroke: rgba(59,130,246,.28);
      stroke-width: 0.78;                 /* ✅ thinner */
      shape-rendering: geometricPrecision;
    }
    .ringDash{
      stroke-dasharray: 1 8.6;            /* ✅ dot-ish */
      stroke-linecap: round;              /* ✅ round dots */
      opacity: .92;
    }
    .ringSolid{
      stroke: rgba(59,130,246,.12);
      opacity: .95;
    }
    @keyframes dashMove { to { stroke-dashoffset: -260; } }
    .dashAnim{
      animation: dashMove 88s linear infinite;
    }

    /* ---------- Orbit Rotators ---------- */
    .rot{
      position:absolute; inset:0;
      will-change: transform;
      animation: spin linear infinite;
      transform: translateZ(0);
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ---------- Nodes ---------- */
    .node{
      position:absolute;
      top:50%; left:50%;
      width:44px; height:44px;
      border-radius:999px;
      overflow:hidden;
      background:#fff;
      border:1px solid rgba(15,23,42,.18);

      /* ✅ place the NODE CENTER on the orbit center, then rotate + radius */
      transform:
        translate(-50%, -50%)
        rotate(var(--a))
        translateX(calc(var(--r) * 1cqw)); /* ✅ PERFECT match with SVG radius (r=44 => 44cqw) */

      transform-origin: 0 0;
    }
    .node.sm{ width:38px; height:38px; }
    .node.xs{ width:34px; height:34px; }

    /* ✅ subtle self-rotation (optional) — rotates inside the bubble */
    @keyframes faceSpin { to { transform: rotate(360deg); } }
    .node img{
      width:100%; height:100%;
      object-fit:cover;
      display:block;
      transform-origin: 50% 50%;
      animation: faceSpin var(--face, 0s) linear infinite; /* set per ring */
    }

    /* center */
    .center{
      position:absolute;
      top:50%; left:50%;
      width:92px; height:92px;
      transform: translate(-50%,-50%);
      border-radius:999px;
      overflow:hidden;
      background:#fff;
      border:1px solid rgba(15,23,42,.18);
    }
    .center img{
      width:100%; height:100%;
      object-fit:cover;
      display:block;
    }

    /* accent dots */
    .dot{
      position:absolute; top:50%; left:50%;
      width:6px; height:6px; border-radius:999px;
      background:#B7F000;
      transform:
        translate(-50%, -50%)
        rotate(var(--a))
        translateX(calc(var(--r) * 1cqw));
      transform-origin: 0 0;
      opacity:.95;
    }

    /* caption */
    .orbitCap{
      position:absolute;
      left:50%; bottom:6%;
      transform: translateX(-50%);
      font-size:12px;
      color: rgba(15,23,42,.45);
      white-space:nowrap;
      pointer-events:none;
    }

    /* Fallback if container units not supported */
    @supports not (width: 1cqw){
      .node, .dot{
        transform:
          translate(-50%, -50%)
          rotate(var(--a))
          translateX(calc(var(--rpx, 180px)));
      }
    }

    /* reduced motion */
    @media (prefers-reduced-motion: reduce){
      .rot{ animation:none !important; }
      .dashAnim{ animation:none !important; }
      .node img{ animation:none !important; }
    }
  `}</style>

  <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10">
    <div className="grid items-center gap-10 lg:grid-cols-2">
      {/* LEFT */}
      <div>
        <div className="mv-kicker">MISSION · VISION</div>

        <h2 className="mv-h mt-4">
          สร้างคุณค่าอย่างยั่งยืน
          <br className="hidden sm:block" />
          ด้วยทีมที่เติบโตไปด้วยกัน
        </h2>

        <div className="mt-8 space-y-8">
          {/* Mission */}
          <div className="border-t border-slate-900/10 pt-6">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/[0.03]">
                <HeartHandshake className="h-5 w-5 text-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold tracking-[0.22em] text-slate-900/70">
                  MISSION
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  พันธกิจของเรา
                </div>
                <p className="mv-p mt-2">{mission}</p>
              </div>
            </div>
          </div>

          {/* Vision */}
          <div className="border-t border-slate-900/10 pt-6">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/[0.03]">
                <Globe2 className="h-5 w-5 text-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold tracking-[0.22em] text-slate-900/70">
                  VISION
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  วิสัยทัศน์ของเรา
                </div>
                <p className="mv-p mt-2">{vision}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="lg:justify-self-end">
        <div className="orbitWrap">
          {/* Rings (SVG) */}
          <svg className="orbitSvg" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="ringStroke ringDash dashAnim" cx="50" cy="50" r="44" strokeDashoffset="0" />
            <circle className="ringStroke ringSolid" cx="50" cy="50" r="38" />
            <circle
              className="ringStroke ringDash dashAnim"
              style={{ animationDuration: "112s" }}
              cx="50" cy="50" r="32" strokeDashoffset="70"
            />
            <circle className="ringStroke ringSolid" cx="50" cy="50" r="24" />
            <circle
              className="ringStroke ringDash dashAnim"
              style={{ animationDuration: "136s" }}
              cx="50" cy="50" r="18" strokeDashoffset="120"
            />
          </svg>

          {/* Center */}
          <div className="center">
            <img src="/images/about/team/center.jpg" alt="center" />
          </div>

          {/* Rotator A (outer) — ✅ faster +20% (208s -> ~173s) */}
          <div className="rot" style={{ animationDuration: "173s" }}>
            <div className="node" style={{ ["--a" as any]: "18deg",  ["--r" as any]: 40, ["--face" as any]: "28s", ["--rpx" as any]: "230px" }}>
              <img src="/images/about/team/t1.jpg" alt="t1" />
            </div>
            <div className="node" style={{ ["--a" as any]: "142deg", ["--r" as any]: 40, ["--face" as any]: "30s", ["--rpx" as any]: "230px" }}>
              <img src="/images/about/team/t2.jpg" alt="t2" />
            </div>
            <div className="node" style={{ ["--a" as any]: "262deg", ["--r" as any]: 40, ["--face" as any]: "26s", ["--rpx" as any]: "230px" }}>
              <img src="/images/about/team/t3.jpg" alt="t3" />
            </div>

            <div className="dot" style={{ ["--a" as any]: "85deg",  ["--r" as any]: 40, ["--rpx" as any]: "230px" }} />
            <div className="dot" style={{ ["--a" as any]: "310deg", ["--r" as any]: 40, ["--rpx" as any]: "230px" }} />
          </div>

          {/* Rotator B (mid, reverse) — ✅ faster +20% (256s -> ~213s) */}
          <div className="rot" style={{ animationDuration: "213s", animationDirection: "reverse" as any }}>
            <div className="node sm" style={{ ["--a" as any]: "40deg",  ["--r" as any]: 32, ["--face" as any]: "34s", ["--rpx" as any]: "170px" }}>
              <img src="/images/about/team/t4.jpg" alt="t4" />
            </div>
            <div className="node sm" style={{ ["--a" as any]: "190deg", ["--r" as any]: 32, ["--face" as any]: "32s", ["--rpx" as any]: "170px" }}>
              <img src="/images/about/team/t5.jpg" alt="t5" />
            </div>
            <div className="dot" style={{ ["--a" as any]: "120deg", ["--r" as any]: 32, ["--rpx" as any]: "170px" }} />
          </div>

          {/* Rotator C (inner) — ✅ faster +20% (312s -> ~260s) */}
          <div className="rot" style={{ animationDuration: "260s" }}>
            <div className="node xs" style={{ ["--a" as any]: "110deg", ["--r" as any]: 18, ["--face" as any]: "38s", ["--rpx" as any]: "120px" }}>
              <img src="/images/about/team/t6.jpg" alt="t6" />
            </div>
            <div className="node xs" style={{ ["--a" as any]: "290deg", ["--r" as any]: 18, ["--face" as any]: "36s", ["--rpx" as any]: "120px" }}>
              <img src="/images/about/team/t7.jpg" alt="t7" />
            </div>
            <div className="dot" style={{ ["--a" as any]: "18deg", ["--r" as any]: 18, ["--rpx" as any]: "120px" }} />
          </div>

          <div className="orbitCap">People move. Standards stay.</div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* WHO WE ARE (bg image) — Pure minimal (no outer border/shadow/gradient/blur) */}
<BgSection bg="/images/about/culture.jpg" className="py-2">
  <section className="relative">
    <style>{`
      @keyframes caretBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      .caret{ display:inline-block; width:10px; margin-left:6px; animation: caretBlink 1s steps(1) infinite; }
    `}</style>

    <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
      {/* Header */}
<div className="text-center">
  <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.22em] text-slate-900">
    <Users className="h-4 w-4 text-slate-900" />
    <span>WHO WE ARE</span>
  </div>

  <TypingTitle
    className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900"
    text="ความเป็นเรา"
    pauseMs={900}
    deleteMs={420}
    typeSpeed={75}
    deleteSpeed={45}
  />

  <p className="mx-auto mt-3 max-w-[820px] text-sm sm:text-base leading-relaxed text-slate-700">
    SHD คือทีมที่เชื่อในมาตรฐานเดียวกันของการเป็นคนทำงานที่ไว้ใจได้
  </p>
</div>
      {/* Cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {whoWeAre.map((x) => (
          <div
            key={x.title}
            className="rounded-2xl bg-white/95 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5">
                {x.icon}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">{x.title}</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-700">{x.desc}</div>

                {/* thin divider (no shadow) */}
                <div className="mt-4 h-px w-16 bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
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

    {/* ✅ NEW: journey design like your screenshot */}
    <JourneyShowcase items={journey} defaultIndex={0} />
  </div>
</BgSection>

{/* AWARDS (mosaic grid — clean, no overlays, Highlights supports VIDEO) */}
<BgSection bg="/images/about/awards.jpg" className="py-2">
  <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10 py-12">
    <SectionHeader
      kicker="AWARDS & RECOGNITION"
      icon={<Award className="h-4 w-4" />}
      title="รางวัลและเกียรติยศของแบรนด์"
      desc="บทพิสูจน์จากการทำงานร่วมกับพาร์ทเนอร์และแพลตฟอร์มในหลายประเทศ"
    />

    {(() => {
      // ------------------------------
      // Image helpers (unique per tile)
      // ------------------------------
      const exts = ["jpg", "png", "webp", "gif"] as const;
      const pickExt = (i: number) => exts[0];
      const getMedia = (i: number) => `/images/about/awards/a${(i % 14) + 1}.${pickExt(i)}`;

      // ------------------------------
      // Video helpers (unique per tile)
      // ------------------------------
      const VIDEO_HIGHLIGHTS = "/images/about/awards/video-highlights.mp4"; // Tile #1
      const VIDEO_RECOG_2024 = "/images/about/awards/video-2024.mp4";       // Tile #2
      const VIDEO_DREAME_2024 = "/images/about/awards/video-dreame.mp4";    // Tile #3

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

      const YearPill = ({ year, tone = "dark" }: { year: string; tone?: "dark" | "light" }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black",
            tone === "dark" ? "bg-black/35 text-white" : "bg-white/75 text-slate-900"
          )}
        >
          {year}
        </span>
      );

      // ✅ สำคัญ: กัน CSS global ที่ทำให้ video ไม่เต็ม tile (อาการเป็นเส้นบางๆ)
      const FullBleedVideo = ({ src }: { src: string }) => (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 object-cover"
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      );

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
          <FullBleedVideo src={src} />
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
            {label ? <CornerLabel icon={<Sparkles className="h-3.5 w-3.5" />} text={label} /> : null}
          </Tile>
        );
      };

      const TextTile = ({
        a,
        className,
        bgSrc,
        textTone = "white",
        titleClassName = "text-sm sm:text-base",
      }: {
        a: { year: string; title: string; org: string; note?: string };
        className: string;
        bgSrc: string;
        textTone?: "white" | "black";
        titleClassName?: string;
      }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <img
            src={bgSrc}
            alt="award-bg"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
          <div className={cn("relative p-5 sm:p-6", textTone === "white" ? "text-white" : "text-slate-900")}>
            <div className="flex items-start justify-between gap-3">
              <YearPill year={a.year} tone={textTone === "white" ? "dark" : "light"} />
              <CheckCircle2 className={cn("h-5 w-5", textTone === "white" ? "text-emerald-300" : "text-emerald-600")} />
            </div>

            {/* ✅ ขยายตัวหนังสือรางวัล ใหญ่ขึ้นนิด */}
            <div className={cn("mt-3 font-black leading-snug", titleClassName)}>{a.title}</div>

            <div className={cn("mt-2 text-sm leading-relaxed", textTone === "white" ? "text-white/90" : "text-slate-700")}>
              {a.org}
            </div>

            {a.note ? (
              <div className={cn("mt-3 text-xs", textTone === "white" ? "text-white/80" : "text-slate-600")}>
                {a.note}
              </div>
            ) : null}
          </div>
        </Tile>
      );

      const VideoTextTile = ({
        videoSrc,
        a,
        className,
        year,
        titleClassName = "text-base sm:text-lg",
      }: {
        videoSrc: string;
        a: { title: string; org: string; note?: string };
        className: string;
        year: string;
        titleClassName?: string;
      }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <FullBleedVideo src={videoSrc} />
          <div className="relative p-5 sm:p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <YearPill year={year} tone="dark" />
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>

            <div className={cn("mt-3 font-black leading-snug", titleClassName)}>{a.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-white/90">{a.org}</div>
            {a.note ? <div className="mt-3 text-xs text-white/80">{a.note}</div> : null}
          </div>
        </Tile>
      );

      const StatTileVideo = ({ className, videoSrc }: { className: string; videoSrc: string }) => (
        <Tile className={cn("min-h-[140px] sm:min-h-[170px]", className)}>
          <FullBleedVideo src={videoSrc} />
          <div className="relative p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[11px] font-black">
                <Sparkles className="h-3.5 w-3.5" />
                Recognition
              </div>
              <YearPill year="2024" tone="dark" />
            </div>

            <div className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              {Math.max(1, total)}
              <span className="text-white/70">+</span>
            </div>

            <div className="mt-2 text-sm font-black text-white/95">Awards across platforms & regions</div>

            <div className="mt-4 text-sm leading-relaxed text-white/85">
              จากการร่วมมืออย่างใกล้ชิดกับแบรนด์และแพลตฟอร์ม เราสร้างผลลัพธ์ที่ “วัดได้จริง” และ “ส่งมอบได้จริง”
            </div>
          </div>
        </Tile>
      );

      // ------------------------------
      // Unique image assignment (NO DUPES)
      // ------------------------------
      // Flip #1 uses a2 + a3
      const IMG_F1A = getMedia(1);  // a2.jpg
      const IMG_F1B = getMedia(2);  // a3.jpg

      // Img tiles use a6, a7, a8
      const IMG_6 = getMedia(5);    // a6.jpg
      const IMG_7 = getMedia(6);    // a7.jpg
      const IMG_8 = getMedia(7);    // a8.jpg

      // Text tile (2021) background uses a9
      const IMG_T1 = getMedia(8);   // a9.jpg

      // Flip #2 uses a10 + a11
      const IMG_F2A = getMedia(9);  // a10.jpg
      const IMG_F2B = getMedia(10); // a11.jpg

      // Desktop-only 3 tiles use a12, a13, a14
      const IMG_D2 = getMedia(11);  // a12.jpg
      const IMG_D3 = getMedia(12);  // a13.jpg
      const IMG_D4 = getMedia(13);  // a14.jpg

      // Mobile-only uses a1 (unique; not used elsewhere)
      const IMG_MOBILE_ONLY = getMedia(0); // a1.jpg

      return (
        <div className="mt-8">
          <div className="grid grid-cols-12 gap-3">
            {/* Row 1 */}
            {/* ✅ Video #1 (unique) */}
            <VideoTile className="col-span-12 sm:col-span-4" src={VIDEO_HIGHLIGHTS} label="Highlights" />

            <FlipTile
              className="col-span-6 sm:col-span-4"
              aSrc={IMG_F1A}
              bSrc={IMG_F1B}
              label="Award Moments"
              intervalMs={2600}
            />

            {/* ✅ Video #2 (unique) */}
            <StatTileVideo className="col-span-6 sm:col-span-4" videoSrc={VIDEO_RECOG_2024} />

            {/* Row 2 */}
            {/* ✅ Video #3 (unique) */}
            <VideoTextTile
              className="col-span-12 lg:col-span-6"
              year="2024"
              videoSrc={VIDEO_DREAME_2024}
              a={{
                title: "รางวัลแบรนด์ที่พึงพอใจสูงสุด",
                org: "Dreame — Shopee ประเทศไทย",
              }}
            />

            <ImgTile className="col-span-6 lg:col-span-3" src={IMG_6} />
            <ImgTile className="col-span-6 lg:col-span-3" src={IMG_7} />

            {/* Row 3 */}
            <ImgTile className="col-span-6 lg:col-span-4" src={IMG_8} />

            <TextTile
              className="col-span-6 lg:col-span-4"
              textTone="black"
              titleClassName="text-base sm:text-lg"
              a={{
                year: "2021",
                title: "รางวัลผู้จำหน่ายดาวรุ่งแห่งปี",
                org: "SUNMOON168 — Shopee ประเทศไทย",
              }}
              bgSrc={IMG_T1}
            />

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

            {/* Mobile only (✅ unique bg) */}
            <div className="lg:hidden col-span-12">
              <TextTile className="" a={a5} bgSrc={IMG_MOBILE_ONLY} />
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