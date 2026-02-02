// frontend/src/pages/WhyPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarHeart,
  CheckCircle2,
  Layers3,
  Pause,
  Play,
  Quote,
  Rocket,
  Sparkles,
  Users,
  X,
} from "lucide-react";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/** ---------------------------------------
 * Auto carousel (hover pause + user pause)
 * + supports left/right buttons
 * -------------------------------------- */
function useAutoScrollCarousel(opts: {
  enabled: boolean;
  intervalMs?: number;
  stepPx?: number;
  idleResumeMs?: number;
}) {
  const { enabled, intervalMs = 3000, stepPx = 520, idleResumeMs = 3000 } = opts;

  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const lastUserAction = useRef<number>(0);

  const paused = hovered || userPaused;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let tick: number | undefined;

    const run = () => {
      // resume after user idle
      if (userPaused && idleResumeMs > 0) {
        const dt = Date.now() - lastUserAction.current;
        if (dt > idleResumeMs) setUserPaused(false);
      }

      if (!paused) {
        const max = el.scrollWidth - el.clientWidth;
        const next = Math.min(el.scrollLeft + stepPx, max);

        if (next >= max - 2) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          el.scrollTo({ left: next, behavior: "smooth" });
        }
      }

      tick = window.setTimeout(run, intervalMs);
    };

    tick = window.setTimeout(run, intervalMs);
    return () => {
      if (tick) window.clearTimeout(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, stepPx, paused, userPaused, idleResumeMs]);

  function markUserAction() {
    lastUserAction.current = Date.now();
    setUserPaused(true);
  }

  function scrollByDir(dir: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    markUserAction();
    el.scrollBy({ left: dir * stepPx, behavior: "smooth" });
  }

  return {
    ref,
    paused,
    userPaused,
    setUserPaused,
    setHovered,
    markUserAction,
    scrollByDir,
  };
}

/** -------------------------
 * Modal (image popup)
 * - closes on overlay click, X button, ESC
 * - LIGHT mode: no dark fullscreen overlay
 * ------------------------ */
function ImageModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: { src: string; title: string; desc?: string; badge?: string } | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6",
        // ✅ light “veil” instead of black overlay
        "bg-white/65 backdrop-blur-md"
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* content */}
      <div
        className={cn(
          "relative w-full max-w-[1100px] overflow-hidden rounded-[28px]",
          // ✅ light card surface
          "bg-white shadow-[0_50px_180px_rgba(15,23,42,0.35)]",
          "ring-1 ring-slate-200"
        )}
      >
        {/* top actions */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 sm:p-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            SHD Careers
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
              "bg-white/85 text-slate-900 backdrop-blur",
              "ring-1 ring-slate-200",
              "transition hover:bg-white active:scale-[0.98]"
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 16:8 media */}
        <div className="relative aspect-[2/1] w-full">
          <img
            src={item.src}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* ✅ keep cinematic but lighter (no black heavy) */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/55" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_420px_at_50%_30%,rgba(255,255,255,0.22),transparent_60%)]" />

          {/* bottom info bar */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div
              className={cn(
                "rounded-3xl bg-white/82 p-4 sm:p-5 text-slate-950 backdrop-blur-xl",
                "shadow-[0_24px_120px_rgba(15,23,42,0.25)]",
                "ring-1 ring-slate-200"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.badge ? (
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                    {item.badge}
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                  Tap image to explore
                </span>
              </div>

              <div className="mt-3 text-lg font-black tracking-tight sm:text-xl">
                {item.title}
              </div>
              {item.desc ? (
                <div className="mt-2 text-sm leading-relaxed text-slate-700">
                  {item.desc}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/jobs"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black",
                    "bg-slate-950 text-white",
                    "shadow-[0_18px_70px_rgba(15,23,42,0.25)]",
                    "transition hover:-translate-y-0.5 active:scale-[0.98]"
                  )}
                >
                  View open roles <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="text-[11px] text-slate-500">
                  Desktop: กด ESC เพื่อปิด • Mobile: แตะพื้นหลังเพื่อปิด
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* small bottom padding edge */}
        <div className="h-2 bg-white" />
      </div>
    </div>
  );
}

function PillarCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  // ✅ light card: black text
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-6",
        "border border-slate-200 bg-white text-slate-950",
        "shadow-[0_18px_70px_rgba(15,23,42,0.10)]",
        "transition hover:-translate-y-1 hover:shadow-[0_22px_90px_rgba(15,23,42,0.14)]"
      )}
    >
      <div className="pointer-events-none absolute -inset-24 opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rotate-12 bg-[radial-gradient(60%_40%_at_50%_50%,rgba(15,23,42,0.08),transparent_60%)]" />
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/5 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black tracking-wide">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-700">{desc}</div>
        </div>
      </div>

      <div className="relative mt-5 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>High-impact teams • Real ownership</span>
      </div>
    </div>
  );
}

/** -------------------------
 * 16:8 card (2:1)
 * - keep same layout, switch to light UI text black
 * ------------------------ */
function PhotoCard16x8({
  src,
  title,
  desc,
  badge,
  onClick,
}: {
  src: string;
  title: string;
  desc?: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-[26px] text-left",
        "w-[min(86vw,560px)]",
        "transition hover:-translate-y-1 active:scale-[0.99]",
        "shadow-[0_18px_70px_-28px_rgba(15,23,42,0.35)]",
        "ring-1 ring-slate-200 bg-white"
      )}
    >
      <div className="relative aspect-[2/1] w-full">
        <img
          src={src}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
          draggable={false}
          loading="lazy"
        />

        {/* ✅ no black cover; only gentle bottom fade for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/40" />

        {/* sweep */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/26 to-transparent" />
        </div>

        {/* top chips */}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            Expand
          </div>

          {badge ? (
            <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
              {badge}
            </div>
          ) : (
            <div className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
              SHD
            </div>
          )}
        </div>

        {/* bottom info panel (light glass) */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div
            className={cn(
              "rounded-3xl bg-white/82 p-3 sm:p-4 text-slate-950 backdrop-blur-xl",
              "shadow-[0_18px_90px_rgba(15,23,42,0.18)]",
              "ring-1 ring-slate-200"
            )}
          >
            <div className="text-sm font-black leading-snug sm:text-base line-clamp-1">
              {title}
            </div>
            {desc ? (
              <div className="mt-1 text-xs leading-relaxed text-slate-700 sm:text-sm line-clamp-2">
                {desc}
              </div>
            ) : null}
          </div>
        </div>

        {/* soft glow */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(520px_220px_at_55%_15%,rgba(255,255,255,0.30),transparent_60%)]" />
        </div>
      </div>
    </button>
  );
}

function CarouselControlsLight({
  onLeft,
  onRight,
  className,
}: {
  onLeft: () => void;
  onRight: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onLeft}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
          "bg-white text-slate-900",
          "ring-1 ring-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.10)]",
          "transition hover:-translate-y-0.5 active:scale-[0.98]"
        )}
        aria-label="Scroll left"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onRight}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
          "bg-white text-slate-900",
          "ring-1 ring-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.10)]",
          "transition hover:-translate-y-0.5 active:scale-[0.98]"
        )}
        aria-label="Scroll right"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function WhyPage() {
  const { t } = useTranslation();

  // ✅ ใส่รูปใน: frontend/public/images/why/*
  const HERO_BG = "/images/why/why-hero.jpg";
  const PILLARS_BG = "/images/why/why-pillars.jpg";
  const STORIES_BG = "/images/why/why-stories.jpg";
  const LIFE_BG = "/images/why/why-life.jpg";
  const CTA_BG = "/images/why/why-cta.jpg";

  // 14 รูป: Employee Stories
  const employeePhotos = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        src: `/images/why/stories/s${i + 1}.jpg`,
        title: `Employee story #${i + 1}`,
        desc: "A day in the team • Real projects • Real growth",
        badge: i % 3 === 0 ? "Growth" : i % 3 === 1 ? "Team" : "Impact",
      })),
    []
  );

  // Events
  const eventPhotos = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        src: `/images/why/events/e${i + 1}.jpg`,
        title: `Event #${i + 1}`,
        desc: "Culture • Collaboration • Moments that matter",
        badge: i % 2 === 0 ? "Event" : "Life",
      })),
    []
  );

  // Auto sliders
  const stories = useAutoScrollCarousel({
    enabled: true,
    intervalMs: 3000,
    stepPx: 560,
    idleResumeMs: 3000,
  });

  const life = useAutoScrollCarousel({
    enabled: true,
    intervalMs: 3200,
    stepPx: 560,
    idleResumeMs: 3000,
  });

  // mouse spotlight
  const sectionRef = useRef<HTMLElement | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<{
    src: string;
    title: string;
    desc?: string;
    badge?: string;
  } | null>(null);

  function openModal(item: { src: string; title: string; desc?: string; badge?: string }) {
    setModalItem(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalItem(null);
  }

  return (
    <>
      <Helmet>
        <title>{t("nav.why")} • SHD Careers</title>
        <meta
          name="description"
          content="Why SHD Technology — growth, people, resources. Employee stories and life at SHD."
        />
      </Helmet>

      <ImageModal open={modalOpen} onClose={closeModal} item={modalItem} />

      {/* =========================
          A) HERO (keep white text)
          ✅ remove black cover on image
         ========================= */}
      <section
        ref={(n) => (sectionRef.current = n)}
        className="group relative isolate overflow-hidden bg-white"
        onMouseMove={(e) => {
          const el = sectionRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          el.style.setProperty("--mx", `${x}%`);
          el.style.setProperty("--my", `${y}%`);
        }}
      >
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.03] will-change-transform"
            style={{ backgroundImage: `url(${HERO_BG})` }}
          />

          {/* ✅ no black overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_25%_18%,rgba(255,255,255,0.24),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_75%_28%,rgba(16,185,129,0.14),transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_70%_78%,rgba(168,85,247,0.14),transparent_62%)]" />

          {/* mouse spotlight */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
              "group-hover:opacity-100"
            )}
            style={{
              background:
                "radial-gradient(560px 380px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.20), rgba(255,255,255,0.08) 42%, transparent 72%)",
            }}
          />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1040px] text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/95 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              WHY SHD TECHNOLOGY
            </div>

            <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              ทำไมถึงต้องร่วมงาน SHD Technology ?
            </h1>

            <p className="mx-auto mt-4 max-w-[70ch] text-base leading-relaxed text-white/90 sm:text-lg">
              โตได้มากกว่าที่คิด เป็นคุณได้เต็มศักยภาพที่ SHD Technology
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                  "bg-white text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
                  "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(0,0,0,0.40)] active:scale-[0.98]"
                )}
              >
                View open roles <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#pillars"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                  "border border-white/25 bg-white/10 text-white backdrop-blur",
                  "transition hover:bg-white/14 hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                Explore pillars
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Rocket className="h-3.5 w-3.5" />
                Limitless growth
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Users className="h-3.5 w-3.5" />
                Talented people
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Layers3 className="h-3.5 w-3.5" />
                Powerful resources
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          B) 3 PILLARS (LIGHT)
         ========================= */}
      <section id="pillars" className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${PILLARS_BG})` }}
          />
          {/* ✅ no black overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_18%,rgba(255,255,255,0.60),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_80%_50%,rgba(16,185,129,0.10),transparent_62%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-14 sm:py-16">
          <div className="mx-auto max-w-[1160px]">
            <div className="flex flex-col gap-3 text-center">
              <div className="inline-flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  3 Pillars
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                โตไว • ทีมเก่ง • โอกาสไร้กรอบ
              </h2>
              <p className="mx-auto max-w-[70ch] text-sm text-slate-700">
                3 เหตุผลหลักที่ทำให้คุณ “เติบโตได้มากกว่าที่คิด” ที่ SHD Technology
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <PillarCard
                icon={<Rocket className="h-6 w-6 text-emerald-600" />}
                title="Limitless Growth"
                desc="โตได้เกินคาด คว้าได้ทุกโกล ด้วยงานจริงที่ท้าทายและการสนับสนุนที่ชัดเจน"
              />
              <PillarCard
                icon={<Users className="h-6 w-6 text-emerald-600" />}
                title="Talented People"
                desc="ร่วมทีมที่ใช่ ชนะได้ทุกโอกาส ทำงานกับคนเก่งที่พร้อมช่วยกันให้สำเร็จ"
              />
              <PillarCard
                icon={<Layers3 className="h-6 w-6 text-emerald-600" />}
                title="Powerful Resources"
                desc="โอกาสไร้กรอบ องค์กรไร้ขีดจำกัด เครื่องมือ ทีม และระบบพร้อมให้คุณพุ่งไปได้ไกล"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          C) EMPLOYEE STORIES (LIGHT)
         ========================= */}
<section className="relative isolate overflow-hidden bg-white">
  <div className="absolute inset-0">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${STORIES_BG})` }}
    />
    {/* ✅ no black overlay */}
    <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_22%,rgba(255,255,255,0.62),transparent_60%)]" />
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
  </div>

  <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
    <div className="grid gap-8 lg:grid-cols-4 lg:items-start">
      {/* left */}
      <div className="lg:col-span-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
          <Quote className="h-4 w-4" />
          Employee Stories
        </div>

        <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
          เรื่องเล่าจากทีมงาน
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          มุมมองจริงจากคนทำงานจริง — โปรเจกต์จริง การเติบโตจริง และทีมที่ช่วยกันทำให้สำเร็จ
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => stories.setUserPaused((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black",
              "bg-white text-slate-900 ring-1 ring-slate-200",
              "shadow-none",
              "transition hover:-translate-y-0.5 active:scale-[0.98]"
            )}
          >
            {stories.userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {stories.userPaused ? "Auto play" : "Pause"}
          </button>

          <CarouselControlsLight
            onLeft={() => stories.scrollByDir(-1)}
            onRight={() => stories.scrollByDir(1)}
          />
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          * เลื่อนอัตโนมัติทุก 3 วิ (หยุดเมื่อเอาเมาส์วาง / แตะเลื่อน / กดปุ่ม)
        </div>
      </div>

      {/* right */}
      <div className="lg:col-span-3">
        <div
          ref={stories.ref}
          className={cn(
            "no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-3",
            "snap-x snap-mandatory"
          )}
          onMouseEnter={() => stories.setHovered(true)}
          onMouseLeave={() => stories.setHovered(false)}
          onPointerDown={() => stories.markUserAction()}
          onWheel={() => stories.markUserAction()}
          onTouchStart={() => stories.markUserAction()}
        >
          {employeePhotos.map((p, idx) => (
            <div key={`${p.src}-${idx}`} className="snap-start">
              {/* ✅ bigger card, ✅ no shadow, ✅ NO title bar on first page */}
              <button
                type="button"
                onClick={() => openModal(p)}
                className={cn(
                  "group relative shrink-0 overflow-hidden rounded-[28px] text-left",
                  "w-[min(94vw,820px)] sm:w-[min(84vw,860px)] lg:w-[860px]",
                  "shadow-none",
                  "ring-0",
                  "transition hover:-translate-y-0.5 active:scale-[0.99]"
                )}
              >
                <div className="relative aspect-[2/1] w-full">
                  <img
                    src={p.src}
                    alt={p.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    draggable={false}
                    loading="lazy"
                  />

                  {/* ✅ no bottom bar / no gradient shadow */}
                  {/* top chips (still keep) */}
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      Expand
                    </div>

                    {p.badge ? (
                      <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                        {p.badge}
                      </div>
                    ) : (
                      <div className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
                        SHD
                      </div>
                    )}
                  </div>

                  {/* soft glow (not shadow) */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(560px_240px_at_55%_15%,rgba(255,255,255,0.28),transparent_60%)]" />
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar{display:none;}
          .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}
        `}</style>
      </div>
    </div>
  </div>
</section>

      {/* =========================
          E) LIFE AT SHD (LIGHT)
         ========================= */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${LIFE_BG})` }}
          />
          {/* ✅ no black overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_70%_30%,rgba(255,255,255,0.58),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
          <div className="mx-auto max-w-[1160px]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
                  <CalendarHeart className="h-4 w-4" />
                  Life at SHD
                </div>
                <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                  อีเวนต์ & วัฒนธรรมทีม
                </h3>
                <p className="mt-2 max-w-[70ch] text-sm text-slate-700">
                  ทำงานเก่งอย่างเดียวไม่พอ — เราให้ความสำคัญกับการเติบโตของทีม ความสัมพันธ์ และช่วงเวลาที่มีความหมาย
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => life.setUserPaused((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black",
                    "bg-white text-slate-900 ring-1 ring-slate-200",
                    "shadow-[0_12px_40px_rgba(15,23,42,0.10)]",
                    "transition hover:-translate-y-0.5 active:scale-[0.98]"
                  )}
                >
                  {life.userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {life.userPaused ? "Auto play" : "Pause"}
                </button>

                <CarouselControlsLight
                  onLeft={() => life.scrollByDir(-1)}
                  onRight={() => life.scrollByDir(1)}
                />
              </div>
            </div>

            <div
              ref={life.ref}
              className={cn(
                "mt-8 no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2",
                "snap-x snap-mandatory"
              )}
              onMouseEnter={() => life.setHovered(true)}
              onMouseLeave={() => life.setHovered(false)}
              onPointerDown={() => life.markUserAction()}
              onWheel={() => life.markUserAction()}
              onTouchStart={() => life.markUserAction()}
            >
              {eventPhotos.map((p, idx) => (
                <div key={`${p.src}-${idx}`} className="snap-start">
                  <PhotoCard16x8
                    src={p.src}
                    title={p.title}
                    desc={p.desc}
                    badge={p.badge}
                    onClick={() => openModal(p)}
                  />
                </div>
              ))}
            </div>

            <style>{`
              .no-scrollbar::-webkit-scrollbar{display:none;}
              .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none;}
            `}</style>
          </div>
        </div>
      </section>

      {/* =========================
          CTA (LIGHT section, keep hero-like card but light)
         ========================= */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${CTA_BG})` }} />
          {/* ✅ no black overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_35%,rgba(255,255,255,0.62),transparent_62%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16 sm:py-18">
          <div className="mx-auto max-w-[1040px] overflow-hidden rounded-[28px] bg-white/82 p-8 text-center text-slate-950 backdrop-blur-xl shadow-[0_30px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-900">
              <Sparkles className="h-4 w-4" />
              Join us
            </div>

            <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Ready to grow with us?
            </h3>
            <p className="mx-auto mt-3 max-w-[70ch] text-sm text-slate-700 sm:text-base">
              ถ้าคุณอยากทำงานที่ “ท้าทายจริง” และ “เติบโตจริง” มาร่วมสร้างอนาคตไปด้วยกันที่ SHD Technology
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "bg-slate-950 text-white",
                  "shadow-[0_24px_80px_rgba(15,23,42,0.25)]",
                  "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(15,23,42,0.30)] active:scale-[0.98]"
                )}
              >
                View open roles <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#pillars"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "border border-slate-200 bg-white text-slate-900",
                  "transition hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                Explore pillars
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Rocket className="h-3.5 w-3.5" />
                Growth first
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Users className="h-3.5 w-3.5" />
                Great teams
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Layers3 className="h-3.5 w-3.5" />
                Real resources
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
