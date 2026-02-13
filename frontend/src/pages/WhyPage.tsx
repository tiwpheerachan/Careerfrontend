// frontend/src/pages/WhyPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

/** -------------------------
 * Media query hook (for stepPx / layout tuning)
 * ------------------------ */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(!!m.matches);
    onChange();
    // Safari fallback
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

/** ---------------------------------------
 * Auto carousel (hover pause + user pause)
 * + supports left/right buttons
 * + ✅ mobile-friendly (touch drag / snap)
 *
 * ✅ FIX: effect must start AFTER element exists
 * -> use callback ref + stateful element (el)
 * -------------------------------------- */
function useAutoScrollCarousel(opts: {
  enabled: boolean;
  intervalMs?: number;
  stepPx?: number;
  idleResumeMs?: number;
}) {
  const { enabled, intervalMs = 3000, stepPx = 560, idleResumeMs = 3000 } = opts;

  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    setEl(node);
  }, []);

  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const lastUserAction = useRef<number>(0);

  const paused = hovered || userPaused;

  useEffect(() => {
    if (!enabled) return;
    if (!el) return;

    let tick: number | undefined;

    const run = () => {
      // auto resume after idle
      if (userPaused && idleResumeMs > 0) {
        const dt = Date.now() - lastUserAction.current;
        if (dt > idleResumeMs) setUserPaused(false);
      }

      // scroll if not paused
      if (!(hovered || userPaused)) {
        const max = el.scrollWidth - el.clientWidth;
        const next = Math.min(el.scrollLeft + stepPx, max);

        if (max <= 2) {
          // nothing to scroll
        } else if (next >= max - 2) el.scrollTo({ left: 0, behavior: "smooth" });
        else el.scrollTo({ left: next, behavior: "smooth" });
      }

      tick = window.setTimeout(run, intervalMs);
    };

    tick = window.setTimeout(run, intervalMs);
    return () => {
      if (tick) window.clearTimeout(tick);
    };
  }, [enabled, el, intervalMs, stepPx, hovered, userPaused, idleResumeMs]);

  function markUserAction() {
    lastUserAction.current = Date.now();
    setUserPaused(true);
  }

  function scrollByDir(dir: -1 | 1) {
    if (!el) return;
    markUserAction();
    el.scrollBy({ left: dir * stepPx, behavior: "smooth" });
  }

  return {
    ref,
    el,
    paused,
    userPaused,
    setUserPaused,
    setHovered,
    markUserAction,
    scrollByDir,
  };
}

/** -------------------------
 * Helper: block click when user drags (mobile horizontal scroll)
 * ------------------------ */
function useBlockClickOnDrag(thresholdPx = 10) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    moved.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = Math.abs(e.clientX - startX.current);
    const dy = Math.abs(e.clientY - startY.current);
    if (dx > thresholdPx || dy > thresholdPx) moved.current = true;
  };

  const onPointerUp = () => {
    startX.current = null;
    startY.current = null;
  };

  const shouldBlockClick = () => moved.current;

  return { onPointerDown, onPointerMove, onPointerUp, shouldBlockClick };
}

type ModalItem = {
  src: string;
  title: string;
  desc?: string;
  badge?: string;
  name?: string;
  role?: string;
  headline?: string;
  quote?: string;
};

/** -------------------------
 * Modal (image popup) — ใช้กับ Employee Stories (เดิม)
 * - closes on overlay click, X button, ESC
 * - ✅ FIX: robust close handlers + stopPropagation inside
 * - ✅ FIX: Mobile layout = image top + scrollable text
 * ------------------------ */
function ImageModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ModalItem | null;
}) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 639px)");

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

  const Overlay = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className: string;
  }) => (
    <div
      role="dialog"
      aria-modal="true"
      className={className}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );

  // ✅ Mobile modal
  if (isMobile) {
    return (
      <Overlay
        className={cn(
          "fixed inset-0 z-[80] flex items-end justify-center p-0",
          "bg-white/70 backdrop-blur-md"
        )}
      >
        <div
          className={cn(
            "relative w-full max-w-[720px] overflow-hidden",
            "rounded-t-[28px] bg-white ring-1 ring-slate-200",
            "shadow-[0_-30px_140px_rgba(15,23,42,0.28)]"
          )}
          style={{ maxHeight: "92vh" }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/92 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                {t("why.modal.brand", { defaultValue: "SHD Careers" })}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                "bg-white text-slate-900 ring-1 ring-slate-200",
                "transition active:scale-[0.98]"
              )}
              aria-label={t("why.modal.closeAria", { defaultValue: "Close" })}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* content */}
          <div className="flex flex-col">
            <div className="relative aspect-[4/3] w-full bg-slate-50">
              <img
                src={item.src}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/15" />

              <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("why.common.expand", { defaultValue: "Expand" })}
                </div>
                {item.badge ? (
                  <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                    {item.badge}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="max-h-[48vh] overflow-y-auto px-4 pb-6 pt-4">
              {item.name || item.role ? (
                <div className="flex flex-wrap items-center gap-2">
                  {item.name ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                      {item.name}
                    </span>
                  ) : null}
                  {item.role ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                      {item.role}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 text-[18px] font-black leading-snug tracking-tight text-slate-950">
                {item.headline || item.title}
              </div>

              {item.desc ? (
                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {item.desc}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                <Link
                  to="/jobs"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black",
                    "bg-slate-950 text-white",
                    "shadow-[0_18px_70px_rgba(15,23,42,0.22)]",
                    "transition active:scale-[0.98]"
                  )}
                >
                  {t("why.modal.viewOpenRoles", { defaultValue: "View open roles" })}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="text-center text-[11px] text-slate-500">
                  {t("why.modal.hint", { defaultValue: "Tap the background to close" })}
                </div>
              </div>
            </div>
          </div>

          <div className="h-2 bg-white" />
        </div>
      </Overlay>
    );
  }

  // ✅ Desktop modal
  return (
    <Overlay
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6",
        "bg-white/65 backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-[1100px] overflow-hidden rounded-[28px]",
          "bg-white shadow-[0_50px_180px_rgba(15,23,42,0.35)]",
          "ring-1 ring-slate-200"
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 sm:p-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {t("why.modal.brand", { defaultValue: "SHD Careers" })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
              "bg-white/90 text-slate-900 backdrop-blur",
              "ring-1 ring-slate-200",
              "transition hover:bg-white active:scale-[0.98]"
            )}
            aria-label={t("why.modal.closeAria", { defaultValue: "Close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[2/1] w-full bg-white">
          <img
            src={item.src}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/55" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_420px_at_50%_30%,rgba(255,255,255,0.22),transparent_60%)]" />

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
                  {t("why.modal.tapToExplore", { defaultValue: "Tap image to explore" })}
                </span>
              </div>

              {item.name || item.role ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {item.name ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 font-black text-white">
                      {item.name}
                    </span>
                  ) : null}
                  {item.role ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                      {item.role}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 text-lg font-black tracking-tight sm:text-xl">{item.title}</div>

              {item.desc ? (
                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
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
                  {t("why.modal.viewOpenRoles", { defaultValue: "View open roles" })}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="text-[11px] text-slate-500">
                  {t("why.modal.hint", {
                    defaultValue:
                      "Desktop: Press ESC to close • Mobile: Tap the background to close",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-2 bg-white" />
      </div>
    </Overlay>
  );
}

/** -------------------------
 * ✅ Life Gallery Modal (NEW)
 * - ✅ modal แสดง “เฉพาะรูป”
 * - ✅ รูปเรียงแนวนอน เลื่อนได้
 * - ✅ ไม่มี carousel / ไม่มี pause/play / ไม่มีคำบรรยาย
 * ------------------------ */
function LifeGalleryModal({
  open,
  onClose,
  title,
  images,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  images: string[];
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");

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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center",
        "bg-white/70 backdrop-blur-md"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-white ring-1 ring-slate-200",
          isMobile
            ? "mx-0 h-[92vh] rounded-t-[28px] self-end"
            : "mx-4 max-w-[1200px] rounded-[28px] shadow-[0_50px_180px_rgba(15,23,42,0.30)]"
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* minimal header (no description) */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3",
            "bg-white/92 backdrop-blur",
            "border-b border-slate-200/70"
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                SHD
              </span>
              <div className="truncate text-sm font-black text-slate-950">{title}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
              "bg-white text-slate-900 ring-1 ring-slate-200",
              "transition active:scale-[0.98]"
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* images only */}
        <div className={cn("p-4", isMobile ? "h-[calc(92vh-60px)]" : "max-h-[80vh]")}>
          <div
            className={cn(
              "no-scrollbar flex h-full gap-3 overflow-x-auto overflow-y-hidden",
              "scroll-smooth snap-x snap-mandatory",
              "touch-pan-x"
            )}
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={cn(
                  "snap-start shrink-0 overflow-hidden rounded-3xl",
                  "bg-slate-50 ring-1 ring-slate-200",
                  isMobile ? "w-[86vw] h-full" : "w-[min(920px,72vw)] h-[70vh]"
                )}
              >
                <img
                  src={src}
                  alt={`${title} ${i + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading="lazy"
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
    </div>
  );
}

function PillarCard({
  icon,
  title,
  desc,
  foot,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  foot: string;
}) {
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
        <span>{foot}</span>
      </div>
    </div>
  );
}

/** -------------------------
 * 16:8 card (2:1) — (คงไว้เผื่อส่วนอื่นใช้)
 * ✅ FIX: block click on drag
 * ------------------------ */
function PhotoCard16x8({
  src,
  title,
  desc,
  badge,
  onClick,
  expandLabel,
}: {
  src: string;
  title: string;
  desc?: string;
  badge?: string;
  onClick?: () => void;
  expandLabel: string;
}) {
  const drag = useBlockClickOnDrag(10);

  return (
    <button
      type="button"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      onClick={(e) => {
        if (drag.shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-[26px] text-left",
        "w-[min(86vw,560px)]",
        "transition hover:-translate-y-1 active:scale-[0.99]",
        "shadow-[0_18px_70px_-28px_rgba(15,23,42,0.35)]",
        "ring-1 ring-slate-200 bg-white",
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
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

        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/25" />

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/26 to-transparent" />
        </div>

        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            {expandLabel}
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

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(520px_220px_at_55%_15%,rgba(255,255,255,0.30),transparent_60%)]" />
        </div>
      </div>

      {(title || desc) && (
        <div className="px-4 pb-4 pt-3">
          <div className="text-sm font-black text-slate-950 line-clamp-2">{title}</div>
          {desc ? <div className="mt-1 text-sm text-slate-700 line-clamp-2">{desc}</div> : null}
        </div>
      )}
    </button>
  );
}

function CarouselControlsLight({
  onLeft,
  onRight,
  className,
  leftAria,
  rightAria,
}: {
  onLeft: () => void;
  onRight: () => void;
  className?: string;
  leftAria: string;
  rightAria: string;
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
          "transition hover:-translate-y-0.5 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
        )}
        aria-label={leftAria}
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
          "transition hover:-translate-y-0.5 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
        )}
        aria-label={rightAria}
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

type StoryPerson = {
  name: string;
  role: string;
  headline: string;
  quote: string;
};

/** -------------------------
 * Desktop story slide (เดิม)
 * ✅ FIX: block click on drag
 * ------------------------ */
function StoryTemplateSlide({
  src,
  expandLabel,
  badge,
  person,
  onClick,
}: {
  src: string;
  expandLabel: string;
  badge?: string;
  person?: StoryPerson;
  onClick?: () => void;
}) {
  const drag = useBlockClickOnDrag(10);

  return (
    <button
      type="button"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      onClick={(e) => {
        if (drag.shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-[28px] text-left",
        "w-[min(94vw,820px)] sm:w-[min(84vw,860px)] lg:w-[860px]",
        "transition hover:-translate-y-0.5 active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
      )}
    >
      <div className="relative aspect-[2/1] w-full bg-white">
        <img
          src={src}
          alt={person?.headline || "Employee story"}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
          loading="lazy"
        />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            {expandLabel}
          </div>

          {badge ? (
            <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
              {badge}
            </div>
          ) : (
            <div className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
              SHD
            </div>
          )}
        </div>

        {person ? (
          <div
            className={cn(
              "absolute left-[6%] top-[28%] w-[56%]",
              "sm:left-[7%] sm:top-[30%] sm:w-[54%]",
              "lg:left-[7%] lg:top-[30%] lg:w-[52%]"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">
                {person.name}
              </span>
              <span className="rounded-full bg-orange-400 px-4 py-2 text-sm font-black text-white">
                {person.role}
              </span>
            </div>

            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-800">
              {person.quote}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(560px_240px_at_40%_20%,rgba(255,255,255,0.28),transparent_60%)]" />
        </div>
      </div>
    </button>
  );
}

/** -------------------------
 * ✅ Mobile story card (ข้อความ “ใต้รูป”)
 * ✅ FIX: block click on drag
 * ------------------------ */
function StoryMobileCard({
  src,
  expandLabel,
  badge,
  person,
  onClick,
}: {
  src: string;
  expandLabel: string;
  badge?: string;
  person?: StoryPerson;
  onClick?: () => void;
}) {
  const drag = useBlockClickOnDrag(10);

  return (
    <button
      type="button"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      onClick={(e) => {
        if (drag.shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
      className={cn(
        "group relative shrink-0 text-left",
        "w-[min(88vw,420px)]",
        "rounded-[26px] bg-white ring-1 ring-slate-200",
        "shadow-[0_18px_70px_-30px_rgba(15,23,42,0.35)]",
        "transition active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20",
        "overflow-hidden"
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-slate-50">
        <img
          src={src}
          alt={person?.headline || "Employee story"}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          draggable={false}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/30" />

        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            {expandLabel}
          </div>
          {badge ? (
            <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
              {badge}
            </div>
          ) : (
            <div className="rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
              SHD
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {person?.name || person?.role ? (
          <div className="flex flex-wrap items-center gap-2">
            {person?.name ? (
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                {person.name}
              </span>
            ) : null}
            {person?.role ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                {person.role}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 text-[15px] font-black leading-snug tracking-tight text-slate-950">
          {person?.headline || "Employee story"}
        </div>

        {person?.quote ? (
          <div className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {person.quote}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-700">—</div>
        )}

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Tap to expand
        </div>
      </div>
    </button>
  );
}

/** -------------------------
 * ✅ Life Category Card (NEW) — 3 cards only
 * - เรียบหรู
 * - ไม่มีคำบรรยาย (ไม่มี desc)
 * ------------------------ */
function LifeCategoryCard({
  title,
  coverSrc,
  onClick,
}: {
  title: string;
  coverSrc: string;
  onClick: () => void;
}) {
  const drag = useBlockClickOnDrag(10);

  return (
    <button
      type="button"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      onClick={(e) => {
        if (drag.shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick();
      }}
      className={cn(
        "group relative overflow-hidden rounded-[28px] text-left",
        "bg-white ring-1 ring-slate-200",
        "shadow-[0_18px_70px_-30px_rgba(15,23,42,0.35)]",
        "transition hover:-translate-y-1 active:scale-[0.99]",
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
      )}
    >
      <div className="relative aspect-[16/9] w-full bg-slate-50">
        <img
          src={coverSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          draggable={false}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/30" />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            View photos
          </div>
          <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
            SHD
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(600px_260px_at_55%_15%,rgba(255,255,255,0.30),transparent_60%)]" />
        </div>
      </div>

      <div className="p-5">
        <div className="text-[15px] font-black tracking-tight text-slate-950">{title}</div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Click to open gallery
        </div>
      </div>
    </button>
  );
}

export default function WhyPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 639px)");

  /**
   * ✅ Background images
   */
  const HERO_BG_DESKTOP = "/images/why/why-hero.jpg";
  const PILLARS_BG_DESKTOP = "/images/why/why-pillars.jpg";
  const STORIES_BG_DESKTOP = "/images/why/why-stories.jpg";
  const LIFE_BG_DESKTOP = "/images/why/why-life.jpg";
  const CTA_BG_DESKTOP = "/images/why/why-cta.jpg";

  const HERO_BG_MOBILE = "/images/hero/mobile/herowhy.webp";
  const PILLARS_BG_MOBILE = "/images/why/why-pillars-mobile.jpg";
  const STORIES_BG_MOBILE = "/images/why/why-stories-mobile.jpg";
  const LIFE_BG_MOBILE = "/images/why/why-life-mobile.jpg";
  const CTA_BG_MOBILE = "/images/why/why-cta-mobile.jpg";

  const STORIES_RENDER_LIMIT = 3;

  const employeePhotosAll = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const idx = i + 1;

      const name = t(`why.stories.cards.${idx}.name`, { defaultValue: "" });
      const role = t(`why.stories.cards.${idx}.role`, { defaultValue: "" });
      const headline = t(`why.stories.cards.${idx}.headline`, { defaultValue: "" });
      const quote = t(`why.stories.cards.${idx}.quote`, { defaultValue: "" });

      const person: StoryPerson | undefined =
        name && role && headline && quote ? { name, role, headline, quote } : undefined;

      const srcDesktop = `/images/why/stories/s${idx}.jpg`;
      const srcMobile = `/images/why/stories/mobile/s${idx}.jpg`;

      return {
        srcDesktop,
        srcMobile,
        title: t("why.stories.itemTitle", { index: idx, defaultValue: `Employee story #${idx}` }),
        desc: t("why.stories.itemDesc", {
          defaultValue: "A day in the team • Real projects • Real growth",
        }),
        badge:
          i % 3 === 0
            ? t("why.stories.badges.growth", { defaultValue: "Growth" })
            : i % 3 === 1
            ? t("why.stories.badges.team", { defaultValue: "Team" })
            : t("why.stories.badges.impact", { defaultValue: "Impact" }),
        person,
      };
    });
  }, [t]);

  const employeePhotos = useMemo(
    () => employeePhotosAll.slice(0, STORIES_RENDER_LIMIT),
    [employeePhotosAll]
  );

  // ✅ Stories carousel (คงเดิม)
  const stories = useAutoScrollCarousel({
    enabled: true,
    intervalMs: 3200,
    stepPx: isMobile ? 360 : 920,
    idleResumeMs: 3000,
  });

  const sectionRef = useRef<HTMLElement | null>(null);

  // ✅ Employee stories modal (เดิม)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<ModalItem | null>(null);

  function openModal(item: ModalItem) {
    setModalItem(item);
    setModalOpen(true);
  }
function HorizontalPhotoStrip({
  images,
  ariaLabel = "Photo gallery",
}: {
  images: Array<{ src: string; alt?: string }>;
  ariaLabel?: string;
}) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div
        ref={stripRef}
        aria-label={ariaLabel}
        className={cn(
          "mt-4 flex gap-3 overflow-x-auto overflow-y-hidden pb-3",
          "scroll-smooth",
          // ✅ โชว์ scrollbar (อย่าใช้ no-scrollbar)
          "life-scrollbar"
        )}
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
        onWheel={(e) => {
          // ✅ ทำให้ scroll wheel (deltaY) วิ่งเป็นแนวนอน
          const el = stripRef.current;
          if (!el) return;

          // ถ้า user กำลังกด Shift อยู่ ให้ปล่อยพฤติกรรมเดิม (ส่วนใหญ่จะเป็นแนวนอนอยู่แล้ว)
          if (e.shiftKey) return;

          // แปลงแนวตั้ง -> แนวนอน
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
          }
        }}
      >
        {images.map((im, i) => (
          <button
            key={`${im.src}-${i}`}
            type="button"
            className={cn(
              "shrink-0 overflow-hidden rounded-2xl",
              "ring-1 ring-slate-200 bg-white",
              "shadow-[0_12px_40px_rgba(15,23,42,0.10)]",
              "transition hover:-translate-y-0.5 active:scale-[0.99]",
              "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
            )}
            // ถ้าคุณต้องการคลิกแล้ว “ดูรูปใหญ่” ก็ใส่ onClick ต่อได้
            onClick={() => {}}
          >
            <div className="relative h-[110px] w-[196px] sm:h-[140px] sm:w-[248px] bg-slate-50">
              <img
                src={im.src}
                alt={im.alt || `photo ${i + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                loading="lazy"
              />
            </div>
          </button>
        ))}
      </div>

      {/* ✅ scrollbar styling (โชว์เป็นแถบสวยๆ) */}
      <style>{`
        .life-scrollbar {
          scrollbar-gutter: stable;
          scrollbar-width: thin;                 /* Firefox */
          scrollbar-color: rgba(15,23,42,.35) rgba(148,163,184,.25);
        }
        .life-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .life-scrollbar::-webkit-scrollbar-track {
          background: rgba(148,163,184,.25);
          border-radius: 999px;
        }
        .life-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(15,23,42,.35);
          border-radius: 999px;
        }
        .life-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(15,23,42,.50);
        }
      `}</style>
    </>
  );
}

  function closeModal() {
    setModalOpen(false);
    setModalItem(null);
  }

  /** =========================
   * ✅ LIFE AT SHD (NEW DATA)
   * - แค่ 3 การ์ดหมวดหมู่
   * - คลิกแล้วเปิด modal (รูปอย่างเดียว)
   * ========================= */
  const lifeCategories = useMemo(() => {
    // ใช้ asset เดิมชุด /images/why/events/e1..e10.jpg เพื่อไม่พัง
    const imgs = Array.from({ length: 10 }).map((_, i) => `/images/why/events/e${i + 1}.jpg`);

    const c1 = {
      key: "events",
      title: t("why.life.categories.1", { defaultValue: "Events & Townhalls" }),
      cover: imgs[0],
      images: imgs.slice(0, 4),
    };
    const c2 = {
      key: "culture",
      title: t("why.life.categories.2", { defaultValue: "Culture & Moments" }),
      cover: imgs[4],
      images: imgs.slice(4, 7),
    };
    const c3 = {
      key: "team",
      title: t("why.life.categories.3", { defaultValue: "Team Activities" }),
      cover: imgs[7],
      images: imgs.slice(7, 10),
    };

    return [c1, c2, c3];
  }, [t]);

  const [lifeOpen, setLifeOpen] = useState(false);
  const [lifeTitle, setLifeTitle] = useState("");
  const [lifeImages, setLifeImages] = useState<string[]>([]);

  function openLifeGallery(title: string, images: string[]) {
    setLifeTitle(title);
    setLifeImages(images);
    setLifeOpen(true);
  }

  function closeLifeGallery() {
    setLifeOpen(false);
    setLifeTitle("");
    setLifeImages([]);
  }

  return (
    <>
      <Helmet>
        <title>
          {t("nav.why")} • {t("brand", { defaultValue: "SHD Careers" })}
        </title>
        <meta
          name="description"
          content={t("why.seo.description", {
            defaultValue:
              "Why SHD Technology — growth, people, resources. Employee stories and life at SHD.",
          })}
        />
      </Helmet>

      {/* ✅ Stories modal (เดิม) */}
      <ImageModal open={modalOpen} onClose={closeModal} item={modalItem} />

      {/* ✅ Life modal (ใหม่: รูปอย่างเดียว) */}
      <LifeGalleryModal open={lifeOpen} onClose={closeLifeGallery} title={lifeTitle} images={lifeImages} />

      {/* =========================
          A) HERO
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
            className="absolute inset-0 hidden bg-cover bg-center scale-[1.03] will-change-transform sm:block"
            style={{ backgroundImage: `url(${HERO_BG_DESKTOP})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.03] will-change-transform sm:hidden"
            style={{ backgroundImage: `url(${HERO_BG_MOBILE})` }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_25%_18%,rgba(255,255,255,0.24),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_75%_28%,rgba(16,185,129,0.14),transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_70%_78%,rgba(168,85,247,0.14),transparent_62%)]" />

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

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1040px] text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/95 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t("why.hero.kicker", { defaultValue: "WHY SHD TECHNOLOGY" })}
            </div>

            <h1 className="mt-6 text-[28px] font-black tracking-tight sm:text-5xl lg:text-6xl">
              {t("why.hero.title", { defaultValue: "ทำไมถึงต้องร่วมงาน SHD Technology ?" })}
            </h1>

            <p className="mx-auto mt-4 max-w-[70ch] text-[15px] leading-relaxed text-white/90 sm:text-lg">
              {t("why.hero.subtitle", {
                defaultValue: "โตได้มากกว่าที่คิด เป็นคุณได้เต็มศักยภาพที่ SHD Technology",
              })}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex w-full max-w-[360px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                  "bg-white text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
                  "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(0,0,0,0.40)] active:scale-[0.98]",
                  "sm:w-auto"
                )}
              >
                {t("why.hero.ctaPrimary", { defaultValue: "View open roles" })}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#pillars"
                className={cn(
                  "inline-flex w-full max-w-[360px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                  "border border-white/25 bg-white/10 text-white backdrop-blur",
                  "transition hover:bg-white/14 hover:-translate-y-0.5 active:scale-[0.98]",
                  "sm:w-auto"
                )}
              >
                {t("why.hero.ctaSecondary", { defaultValue: "Explore pillars" })}
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Rocket className="h-3.5 w-3.5" />
                {t("why.hero.chips.growth", { defaultValue: "Limitless growth" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Users className="h-3.5 w-3.5" />
                {t("why.hero.chips.people", { defaultValue: "Talented people" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Layers3 className="h-3.5 w-3.5" />
                {t("why.hero.chips.resources", { defaultValue: "Powerful resources" })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          B) 3 PILLARS
         ========================= */}
      <section id="pillars" className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 hidden bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${PILLARS_BG_DESKTOP})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center sm:hidden"
            style={{ backgroundImage: `url(${PILLARS_BG_MOBILE})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_18%,rgba(255,255,255,0.60),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_80%_50%,rgba(16,185,129,0.10),transparent_62%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
          <div className="mx-auto max-w-[1160px]">
            <div className="flex flex-col gap-3 text-center">
              <div className="inline-flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {t("why.pillars.kicker", { defaultValue: "3 Pillars" })}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {t("why.pillars.title", { defaultValue: "โตไว • ทีมเก่ง • โอกาสไร้กรอบ" })}
              </h2>
              <p className="mx-auto max-w-[70ch] text-sm text-slate-700">
                {t("why.pillars.subtitle", {
                  defaultValue: "3 เหตุผลหลักที่ทำให้คุณ “เติบโตได้มากกว่าที่คิด” ที่ SHD Technology",
                })}
              </p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <PillarCard
                icon={<Rocket className="h-6 w-6 text-emerald-600" />}
                title={t("why.pillars.cards.growth.title", { defaultValue: "Limitless Growth" })}
                desc={t("why.pillars.cards.growth.desc", {
                  defaultValue:
                    "โตได้เกินคาด คว้าได้ทุกโกล ด้วยงานจริงที่ท้าทายและการสนับสนุนที่ชัดเจน",
                })}
                foot={t("why.pillars.foot", { defaultValue: "High-impact teams • Real ownership" })}
              />
              <PillarCard
                icon={<Users className="h-6 w-6 text-emerald-600" />}
                title={t("why.pillars.cards.people.title", { defaultValue: "Talented People" })}
                desc={t("why.pillars.cards.people.desc", {
                  defaultValue: "ร่วมทีมที่ใช่ ชนะได้ทุกโอกาส ทำงานกับคนเก่งที่พร้อมช่วยกันให้สำเร็จ",
                })}
                foot={t("why.pillars.foot", { defaultValue: "High-impact teams • Real ownership" })}
              />
              <PillarCard
                icon={<Layers3 className="h-6 w-6 text-emerald-600" />}
                title={t("why.pillars.cards.resources.title", { defaultValue: "Powerful Resources" })}
                desc={t("why.pillars.cards.resources.desc", {
                  defaultValue:
                    "โอกาสไร้กรอบ องค์กรไร้ขีดจำกัด เครื่องมือ ทีม และระบบพร้อมให้คุณพุ่งไปได้ไกล",
                })}
                foot={t("why.pillars.foot", { defaultValue: "High-impact teams • Real ownership" })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          C) EMPLOYEE STORIES
         ========================= */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 hidden bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${STORIES_BG_DESKTOP})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center sm:hidden"
            style={{ backgroundImage: `url(${STORIES_BG_MOBILE})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_22%,rgba(255,255,255,0.62),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-4 lg:items-start">
            <div className="lg:col-span-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
                <Quote className="h-4 w-4" />
                {t("why.stories.kicker", { defaultValue: "Employee Stories" })}
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                {t("why.stories.title", { defaultValue: "เรื่องเล่าจากทีมของเรา" })}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {t("why.stories.subtitle", {
                  defaultValue:
                    "มุมมองจริงจากคนทำงานจริง — โปรเจกต์จริง การเติบโตจริง และทีมที่ช่วยกันทำให้สำเร็จ",
                })}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => stories.setUserPaused((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black",
                    "bg-white text-slate-900 ring-1 ring-slate-200",
                    "shadow-none",
                    "transition hover:-translate-y-0.5 active:scale-[0.98]",
                    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-900/20"
                  )}
                >
                  {stories.userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {stories.userPaused
                    ? t("why.carousel.autoPlay", { defaultValue: "Auto play" })
                    : t("why.carousel.pause", { defaultValue: "Pause" })}
                </button>

                <CarouselControlsLight
                  onLeft={() => stories.scrollByDir(-1)}
                  onRight={() => stories.scrollByDir(1)}
                  leftAria={t("why.carousel.leftAria", { defaultValue: "Scroll left" })}
                  rightAria={t("why.carousel.rightAria", { defaultValue: "Scroll right" })}
                />
              </div>

              <div className="mt-4 text-[11px] text-slate-500">
                {t("why.stories.note", {
                  defaultValue: "* แสดง 3 เรื่องเล่าแรก (ทำระบบเผื่อเพิ่มแล้ว) — เลื่อนได้บนมือถือ",
                })}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div
                ref={stories.ref}
                className={cn(
                  "no-scrollbar flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth pb-3",
                  "snap-x snap-mandatory",
                  "touch-pan-x"
                )}
                style={{
                  WebkitOverflowScrolling: "touch",
                  touchAction: "pan-x",
                }}
                onMouseEnter={() => stories.setHovered(true)}
                onMouseLeave={() => stories.setHovered(false)}
                onPointerDown={() => stories.markUserAction()}
                onWheel={() => stories.markUserAction()}
                onTouchStart={() => stories.markUserAction()}
              >
                {employeePhotos.map((p, idx) => (
                  <div key={`${p.srcDesktop}-${idx}`} className="snap-start">
                    <div className="sm:hidden">
                      <StoryMobileCard
                        src={p.srcMobile}
                        badge={p.badge}
                        expandLabel={t("why.common.expand", { defaultValue: "Expand" })}
                        person={p.person}
                        onClick={() =>
                          openModal({
                            src: p.srcMobile,
                            title: p.person?.headline || p.title,
                            desc: p.person?.quote || p.desc,
                            badge: p.badge,
                            name: p.person?.name,
                            role: p.person?.role,
                            headline: p.person?.headline,
                            quote: p.person?.quote,
                          })
                        }
                      />
                    </div>

                    <div className="hidden sm:block">
                      <StoryTemplateSlide
                        src={p.srcDesktop}
                        badge={p.badge}
                        expandLabel={t("why.common.expand", { defaultValue: "Expand" })}
                        person={p.person}
                        onClick={() =>
                          openModal({
                            src: p.srcDesktop,
                            title: p.person?.headline || p.title,
                            desc: p.person?.quote || p.desc,
                            badge: p.badge,
                            name: p.person?.name,
                            role: p.person?.role,
                            headline: p.person?.headline,
                            quote: p.person?.quote,
                          })
                        }
                      />
                    </div>
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
          E) LIFE AT SHD (NEW)
         ========================= */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 hidden bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${LIFE_BG_DESKTOP})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center sm:hidden"
            style={{ backgroundImage: `url(${LIFE_BG_MOBILE})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_70%_30%,rgba(255,255,255,0.58),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-14 sm:py-16">
          <div className="mx-auto max-w-[1160px]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur">
                  <CalendarHeart className="h-4 w-4" />
                  {t("why.life.kicker", { defaultValue: "Life at SHD" })}
                </div>
                <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                  {t("why.life.title", { defaultValue: "อีเวนต์ & วัฒนธรรมทีม" })}
                </h3>
                <p className="mt-2 max-w-[70ch] text-sm text-slate-700">
                  {t("why.life.subtitle", {
                    defaultValue:
                      "ทำงานเก่งอย่างเดียวไม่พอ — เราให้ความสำคัญกับการเติบโตของทีม ความสัมพันธ์ และช่วงเวลาที่มีความหมาย",
                  })}
                </p>
              </div>

              {/* ✅ ไม่มี carousel controls / ไม่มี pause/play */}
              <div className="text-[11px] text-slate-500">
                {t("why.life.note", { defaultValue: "เลือกหมวดเพื่อดูรูปทั้งหมดแบบเลื่อนแนวนอน" })}
              </div>
            </div>

            {/* ✅ 3 category cards only */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {lifeCategories.map((c) => (
                <LifeCategoryCard
                  key={c.key}
                  title={c.title}
                  coverSrc={c.cover}
                  onClick={() => openLifeGallery(c.title, c.images)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          CTA
         ========================= */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 hidden bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${CTA_BG_DESKTOP})` }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center sm:hidden"
            style={{ backgroundImage: `url(${CTA_BG_MOBILE})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_35%,rgba(255,255,255,0.62),transparent_62%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-14 sm:py-18">
          <div className="mx-auto max-w-[1040px] overflow-hidden rounded-[28px] bg-white/82 p-7 text-center text-slate-950 backdrop-blur-xl shadow-[0_30px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-900">
              <Sparkles className="h-4 w-4" />
              {t("why.cta.kicker", { defaultValue: "Join us" })}
            </div>

            <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {t("why.cta.title", { defaultValue: "Ready to grow with us?" })}
            </h3>
            <p className="mx-auto mt-3 max-w-[70ch] text-sm text-slate-700 sm:text-base">
              {t("why.cta.subtitle", {
                defaultValue:
                  "ถ้าคุณอยากทำงานที่ “ท้าทายจริง” และ “เติบโตจริง” มาร่วมสร้างอนาคตไปด้วยกันที่ SHD Technology",
              })}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "bg-slate-950 text-white",
                  "shadow-[0_24px_80px_rgba(15,23,42,0.25)]",
                  "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(15,23,42,0.30)] active:scale-[0.98]",
                  "sm:w-auto"
                )}
              >
                {t("why.cta.ctaPrimary", { defaultValue: "View open roles" })}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#pillars"
                className={cn(
                  "inline-flex w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "border border-slate-200 bg-white text-slate-900",
                  "transition hover:-translate-y-0.5 active:scale-[0.98]",
                  "sm:w-auto"
                )}
              >
                {t("why.cta.ctaSecondary", { defaultValue: "Explore pillars" })}
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Rocket className="h-3.5 w-3.5" />
                {t("why.cta.chips.growthFirst", { defaultValue: "Growth first" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("why.cta.chips.greatTeams", { defaultValue: "Great teams" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Layers3 className="h-3.5 w-3.5" />
                {t("why.cta.chips.realResources", { defaultValue: "Real resources" })}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
