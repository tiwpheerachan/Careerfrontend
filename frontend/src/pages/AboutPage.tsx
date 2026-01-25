// frontend/src/pages/AboutPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Globe2,
  HeartHandshake,
  Sparkles,
  Rocket,
  Smile,
  Users,
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

/** count animation: 1 → 7 quickly (used for Hero) */
function useCountTo(target: number, opts?: { ms?: number; enabled?: boolean }) {
  const { ms = 680, enabled = true } = opts ?? {};
  const reduced = usePrefersReducedMotion();
  const [v, setV] = useState(1);

  useEffect(() => {
    if (!enabled) return;
    if (reduced) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 1;
    const to = target;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      // fast ease-out
      const e = 1 - Math.pow(1 - p, 3);
      const next = Math.max(from, Math.min(to, Math.round(from + (to - from) * e)));
      setV(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, enabled, reduced]);

  return v;
}

/** mouse spotlight (like your WhyPage hero) */
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
        <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
          {icon}
          {kicker}
        </span>
      </div>
      <h2 className={cn("text-2xl font-black tracking-tight text-white sm:text-3xl")}>{title}</h2>
      {desc ? <p className="max-w-[80ch] text-sm leading-relaxed text-white/75">{desc}</p> : null}
    </div>
  );
}

/** “3D-ish” Country Card: floating, tilt on hover, link to jobs with office filter */
function CountryCard3D({
  name,
  tag,
  flagEmoji,
  bg,
  href,
  delay = 0,
}: {
  name: string;
  tag: string;
  flagEmoji: string;
  bg: string; // css gradient string
  href: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  return (
    <Link
      to={href}
      onMouseMove={(e) => {
        if (reduced) return;
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; // 0..1
        const py = (e.clientY - r.top) / r.height; // 0..1
        const ry = (px - 0.5) * 10;
        const rx = (0.5 - py) * 10;
        setTilt({ rx, ry });
      }}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      className={cn(
        "group relative isolate overflow-hidden rounded-[26px]",
        "w-[min(86vw,520px)] sm:w-[360px] lg:w-[380px] shrink-0",
        "shadow-[0_18px_70px_-28px_rgba(0,0,0,0.65)]",
        "transition hover:-translate-y-1 active:scale-[0.99]"
      )}
      style={{
        transform: reduced
          ? undefined
          : `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transitionDelay: `${delay}ms`,
      }}
      aria-label={`Open jobs in ${name}`}
    >
      {/* background */}
      <div className="absolute inset-0" style={{ background: bg }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/55" />

      {/* floating bits */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/18 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-14 h-56 w-56 rounded-full bg-white/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/22 to-transparent" />
      </div>

      {/* content */}
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur">
            <Globe2 className="h-3.5 w-3.5" />
            Office
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-black text-slate-950">
            {flagEmoji} {tag}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-white">{name}</div>
            <div className="mt-1 text-xs text-white/80">
              คลิกเพื่อดูตำแหน่งงานของประเทศนี้
            </div>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white backdrop-blur",
              "transition group-hover:bg-white/16"
            )}
          >
            Jobs <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* “platform” shadow base */}
      <div className="pointer-events-none absolute inset-x-10 bottom-2 h-3 rounded-full bg-black/35 blur-lg" />
    </Link>
  );
}

function ValueCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-6",
        "border border-white/18 bg-white/10 text-white backdrop-blur-xl",
        "shadow-[0_18px_70px_rgba(0,0,0,0.26)]",
        "transition hover:-translate-y-1 hover:bg-white/14"
      )}
    >
      <div className="pointer-events-none absolute -inset-24 opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rotate-12 bg-[radial-gradient(60%_40%_at_50%_50%,rgba(255,255,255,0.18),transparent_60%)]" />
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-black tracking-wide">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-white/80">{desc}</div>
        </div>
      </div>
    </div>
  );
}

/** Timeline with “stage cards” */
function JourneyTimeline({
  items,
}: {
  items: Array<{
    year: string;
    title: string;
    desc: string;
    highlight?: string;
  }>;
}) {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      {items.map((it, i) => (
        <div
          key={`${it.year}-${i}`}
          className={cn(
            "group relative overflow-hidden rounded-3xl p-6",
            "border border-white/16 bg-white/8 text-white backdrop-blur-xl",
            "shadow-[0_22px_90px_rgba(0,0,0,0.30)]",
            "transition hover:-translate-y-1 hover:bg-white/12"
          )}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
            <div className="absolute inset-0 bg-[radial-gradient(700px_260px_at_20%_20%,rgba(255,255,255,0.14),transparent_60%)]" />
          </div>

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
              <div className="text-sm font-black text-white">{it.year}</div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black">{it.title}</div>
                {it.highlight ? (
                  <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-black text-slate-950">
                    {it.highlight}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/80">{it.desc}</div>
            </div>
          </div>

          <div className="relative mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="relative mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/80">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Build • Scale • Global</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // backgrounds (put images in /public/images/about/*)
  const HERO_BG = "/images/about/about-hero.jpg";
  const ABOUT_BG = "/images/about/about-us.jpg";
  const IDENTITY_BG = "/images/about/identity.jpg";
  const JOURNEY_BG = "/images/about/journey.jpg";
  const VALUES_BG = "/images/about/values.jpg";

  // Hero spotlight
  const hero = useMouseSpotlight();

  // fast counter 1..7
  const officeCount = useCountTo(7, { ms: 620, enabled: true });

  // Countries: 7 “3D” cards
  // 👉 ลิงก์ไปหน้า jobs ด้วย query param ตัวอย่าง: /jobs?office=th
  // ถ้าหน้า JobsPage ของคุณใช้ key อื่น ปรับให้ตรงได้เลย
  const offices = useMemo(
    () => [
      {
        name: "Thailand",
        tag: "TH",
        flag: "🇹🇭",
        href: "/jobs?office=th",
        bg: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(168,85,247,0.75))",
      },
      {
        name: "China",
        tag: "CN",
        flag: "🇨🇳",
        href: "/jobs?office=cn",
        bg: "linear-gradient(135deg, rgba(244,63,94,0.82), rgba(245,158,11,0.72))",
      },
      {
        name: "Indonesia",
        tag: "ID",
        flag: "🇮🇩",
        href: "/jobs?office=id",
        bg: "linear-gradient(135deg, rgba(16,185,129,0.82), rgba(59,130,246,0.70))",
      },
      {
        name: "Philippines",
        tag: "PH",
        flag: "🇵🇭",
        href: "/jobs?office=ph",
        bg: "linear-gradient(135deg, rgba(14,165,233,0.80), rgba(99,102,241,0.72))",
      },
      {
        name: "Vietnam",
        tag: "VN",
        flag: "🇻🇳",
        href: "/jobs?office=vn",
        bg: "linear-gradient(135deg, rgba(248,113,113,0.80), rgba(168,85,247,0.72))",
      },
      {
        name: "Brazil",
        tag: "BR",
        flag: "🇧🇷",
        href: "/jobs?office=br",
        bg: "linear-gradient(135deg, rgba(34,197,94,0.82), rgba(250,204,21,0.72))",
      },
      {
        name: "Mexico",
        tag: "MX",
        flag: "🇲🇽",
        href: "/jobs?office=mx",
        bg: "linear-gradient(135deg, rgba(34,197,94,0.78), rgba(244,63,94,0.70))",
      },
    ],
    []
  );

  // “About us” content (you can i18n later; for now keep Thai per your text)
  const aboutTitleTH = "บริษัท เอสเอชดี เทคโนโลยี จำกัด";
  const aboutDescTH =
    "บริษัท เอสเอชดี เทคโนโลยี จำกัด เป็นผู้นำเข้าและจัดจำหน่ายผลิตภัณฑ์อิเล็กทรอนิกส์อันชาญฉลาด อำนวยความสะดวกให้ใช้ชีวิตง่ายขึ้น เราเป็นผู้จัดจำหน่ายที่ได้รับอนุญาตแต่เพียงผู้เดียวของเครื่องหมายการค้าต่อไปนี้ : Xiaomi, Dreame, 70mai, Zepp, Wanbo, Levoit, Jimmy, MAIMO, Usmile เป็นต้น และเรายังคงมุ่งมั่นที่จะเป็นผู้จัดจำหน่ายเครื่องใช้ไฟฟ้าอัจฉริยะแถวหน้าสำหรับใช้ในชีวิตประจำวันผ่านช่องทางออนไลน์ และหน้าร้าน";

  const authorizedBrands = [
    "Xiaomi",
    "Dreame",
    "70mai",
    "Zepp",
    "Wanbo",
    "Levoit",
    "Jimmy",
    "MAIMO",
    "Usmile",
  ];

  const globalPresence = [
    { k: "Thailand", v: "สำนักงานใหญ่และทีมหลัก" },
    { k: "China", v: "ซัพพลายเชนและพาร์ทเนอร์" },
    { k: "Indonesia", v: "ตลาดเติบโตเร็ว" },
    { k: "Philippines", v: "โฟกัสออนไลน์" },
    { k: "Vietnam", v: "ทีมปฏิบัติการแข็งแรง" },
    { k: "Brazil", v: "ขยายสเกล LATAM" },
    { k: "Mexico", v: "ตลาดสำคัญในภูมิภาค" },
    // คุณบอก Middle East เพิ่ม — ใส่เป็น “future / region” ไม่รวมใน 7 ตัวเลข
    { k: "Middle East", v: "Regional expansion" },
  ];

  const identity = [
    {
      icon: <Compass className="h-6 w-6 text-emerald-200" />,
      title: "เรียบง่าย",
      desc:
        "เราเชื่อในความเรียบง่ายและความจริงใจ ตอกย้ำถึงชีวิตที่ซื่อสัตย์ ติดดิน และจริงใจต่อตนเอง",
    },
    {
      icon: <Smile className="h-6 w-6 text-emerald-200" />,
      title: "มีความสุข",
      desc:
        "เราเป็นมิตร รักความสนุก และเต็มไปด้วยพลังงาน กระจายความสุขให้กับทุกคนที่พบ",
    },
    {
      icon: <Users className="h-6 w-6 text-emerald-200" />,
      title: "ร่วมมือร่วมใจ",
      desc:
        "เราพัฒนาความแข็งแกร่งจากการทำงานร่วมกัน และให้ความสำคัญกับเวลาที่มีร่วมกันในที่ทำงาน",
    },
  ];

  const journey = [
    {
      year: "2014",
      title: "Start",
      desc: "เริ่มต้นจากทีมเล็ก ๆ ที่โฟกัสคุณภาพสินค้าและประสบการณ์ลูกค้าเป็นอันดับหนึ่ง",
      highlight: "Foundation",
    },
    {
      year: "2017",
      title: "Scale Online",
      desc: "ขยายช่องทางออนไลน์ สร้างระบบการขายและบริการหลังการขายให้แข็งแรง",
      highlight: "E-commerce",
    },
    {
      year: "2019",
      title: "Official Distributor",
      desc: "ได้รับความไว้วางใจเป็นผู้จัดจำหน่ายอย่างเป็นทางการของหลายแบรนด์ชั้นนำ",
      highlight: "Trusted",
    },
    {
      year: "2021",
      title: "Multi-country Expansion",
      desc: "เริ่มขยายทีมและตลาดสู่หลายประเทศในเอเชีย พร้อมมาตรฐานการทำงานเดียวกัน",
      highlight: "SEA",
    },
    {
      year: "2023",
      title: "LATAM Growth",
      desc: "ต่อยอดสู่ตลาดบราซิลและเม็กซิโก ขยายสเกลการดำเนินงานให้รองรับการเติบโต",
      highlight: "LATAM",
    },
    {
      year: "Now",
      title: "Build Global Platform",
      desc: "เดินหน้าสร้างองค์กรระดับโลก ด้วยทีมที่แข็งแรง ระบบที่ดี และวัฒนธรรมที่ร่วมมือกัน",
      highlight: "Global",
    },
  ];

  const values = [
    {
      icon: <Rocket className="h-6 w-6 text-emerald-200" />,
      title: "Ownership",
      desc: "รับผิดชอบงานเหมือนเป็นเจ้าของ กล้าคิด กล้าตัดสินใจ และพาให้สำเร็จ",
    },
    {
      icon: <Sparkles className="h-6 w-6 text-emerald-200" />,
      title: "Innovation",
      desc: "มองหาวิธีที่ดีขึ้นเสมอ ใช้ข้อมูลและเทคโนโลยีเพื่อสร้างผลลัพธ์จริง",
    },
    {
      icon: <HeartHandshake className="h-6 w-6 text-emerald-200" />,
      title: "Respect",
      desc: "เคารพกันและกัน เปิดใจรับฟัง และสื่อสารด้วยความจริงใจ",
    },
  ];

  return (
    <>
      <Helmet>
        <title>{t("nav.about")} • SHD Careers</title>
        <meta
          name="description"
          content="About SHD Technology — global offices, authorized distributor brands, culture, journey, and values."
        />
      </Helmet>

      {/* =========================
          1) HERO: Offices (7) + 3D country icons
         ========================= */}
      <section
        ref={(n) => (hero.ref.current = n)}
        className="group relative isolate overflow-hidden bg-slate-950"
        onMouseMove={hero.onMove}
      >
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.03]"
            style={{ backgroundImage: `url(${HERO_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/80" />

          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_18%,rgba(255,255,255,0.20),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_70%_78%,rgba(168,85,247,0.18),transparent_62%)]" />

          <div
            className={cn("pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300", "group-hover:opacity-100")}
            style={{
              background:
                "radial-gradient(560px 380px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.18), rgba(255,255,255,0.06) 42%, transparent 72%)",
            }}
          />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            {/* left copy */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                <Building2 className="h-4 w-4" />
                OUR OFFICES
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                สำนักงานของเราใน <span className="text-white/90">7 ประเทศ</span>
              </h1>

              <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-white/80 sm:text-lg">
                เราทำงานแบบ Global — ทีมกระจายอยู่หลายประเทศ และคุณสามารถเลือกสมัครงานตามประเทศที่สนใจได้ทันที
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-3xl bg-white/10 px-5 py-3 backdrop-blur">
                  <div className="text-[11px] font-semibold text-white/70">
                    Countries
                  </div>
                  <div className="text-3xl font-black tracking-tight">
                    {officeCount}
                  </div>
                  <div className="text-xs text-white/70">
                    (1 → 7)
                  </div>
                </div>

                <Link
                  to="/jobs"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                    "bg-white text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
                    "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(0,0,0,0.55)] active:scale-[0.98]"
                  )}
                >
                  Browse all jobs <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("about-us");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black",
                    "border border-white/18 bg-white/10 text-white backdrop-blur",
                    "transition hover:bg-white/16 hover:-translate-y-0.5 active:scale-[0.98]"
                  )}
                >
                  Learn about SHD
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/75">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                  <Globe2 className="h-3.5 w-3.5" />
                  Global operation
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Authorized distributor
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                  <Users className="h-3.5 w-3.5" />
                  Strong teams
                </span>
              </div>
            </div>

            {/* right: “3D country icons” row (like the ref image vibe) */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[40px] bg-white/5 blur-2xl" />

              <div className="relative rounded-[32px] border border-white/14 bg-white/6 p-4 backdrop-blur-xl shadow-[0_24px_110px_rgba(0,0,0,0.40)]">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">Choose a country</div>
                  <div className="text-[11px] text-white/60">Click → open jobs</div>
                </div>

                <div className="mt-4 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {offices.map((o, i) => (
                    <CountryCard3D
                      key={o.tag}
                      name={o.name}
                      tag={o.tag}
                      flagEmoji={o.flag}
                      bg={o.bg}
                      href={o.href}
                      delay={i * 40}
                    />
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-black/25 p-4 text-white/80">
                  <div className="text-xs font-semibold text-white/70">Tip</div>
                  <div className="mt-1 text-sm leading-relaxed">
                    ถ้าคุณอยากดูทุกประเทศพร้อมกัน ไปที่{" "}
                    <button
                      className="font-black text-white underline underline-offset-4"
                      onClick={() => navigate("/jobs")}
                      type="button"
                    >
                      Jobs
                    </button>
                    {" "}แล้วใช้ตัวกรอง “Office”.
                  </div>
                </div>
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
          2) ABOUT US
         ========================= */}
      <section id="about-us" className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${ABOUT_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_20%,rgba(255,255,255,0.14),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <SectionHeader
                kicker="ABOUT US"
                icon={<Sparkles className="h-4 w-4" />}
                title={aboutTitleTH}
                desc="ผู้นำเข้าและจัดจำหน่ายผลิตภัณฑ์อิเล็กทรอนิกส์อัจฉริยะ เพื่อทำให้ชีวิตง่ายขึ้น"
              />

              <p className="mt-6 text-sm leading-relaxed text-white/80">
                {aboutDescTH}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Authorized distributor of selected trademarks
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
                  <Globe2 className="h-4 w-4 text-emerald-300" />
                  Online + Offline channels
                </span>
              </div>
            </div>

            {/* right: brands + presence */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/14 bg-white/8 p-6 text-white backdrop-blur-xl shadow-[0_24px_110px_rgba(0,0,0,0.35)]">
                <div className="text-sm font-black">Authorized distributor</div>
                <div className="mt-2 text-sm text-white/70">
                  (Authorized distributor of the following trademarks)
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {authorizedBrands.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-black text-slate-950"
                    >
                      {b}
                    </span>
                  ))}
                </div>

                <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/18 to-transparent" />

                <div className="mt-5 text-xs font-semibold text-white/70">
                  Distribution & Operations
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {globalPresence.map((x) => (
                    <div
                      key={x.k}
                      className="rounded-2xl border border-white/14 bg-white/8 px-4 py-3"
                    >
                      <div className="text-xs font-semibold text-white/70">{x.k}</div>
                      <div className="mt-0.5 text-sm font-black text-white">{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/14 bg-white/8 p-6 text-white backdrop-blur-xl shadow-[0_24px_110px_rgba(0,0,0,0.35)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black">Want to join us?</div>
                    <div className="mt-1 text-sm text-white/75">
                      เลือกประเทศ แล้วดูตำแหน่งที่เหมาะกับคุณได้ทันที
                    </div>
                  </div>
                  <Link
                    to="/jobs"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black",
                      "bg-white text-slate-950 transition hover:-translate-y-0.5 active:scale-[0.98]"
                    )}
                  >
                    View jobs <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          3) OUR IDENTITY: “ความเป็นเรา”
         ========================= */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${IDENTITY_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/90" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_80%_30%,rgba(16,185,129,0.12),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
          <SectionHeader
            kicker="WHO WE ARE"
            icon={<Compass className="h-4 w-4" />}
            title="ความเป็นเรา"
            desc="นิยามว่าเราคือใคร — สื่อสารอย่างไร ประพฤติอย่างไร และตอบสนองต่อสถานการณ์ต่าง ๆ อย่างไร"
            align="center"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {identity.map((x) => (
              <ValueCard key={x.title} icon={x.icon} title={x.title} desc={x.desc} />
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-[980px] rounded-[28px] bg-white/8 p-6 text-white backdrop-blur-xl shadow-[0_28px_130px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
                <Sparkles className="h-5 w-5 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black">สาระสำคัญ</div>
                <div className="mt-1 text-sm leading-relaxed text-white/80">
                  พวกเราเรียบง่าย มีความสุข และร่วมมือร่วมใจ — ลักษณะสำคัญเหล่านี้คือสิ่งที่เห็นได้ในทุกย่างก้าวของการเดินทางของเรา
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          4) OUR JOURNEY: “การเดินทางของพวกเรา”
         ========================= */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${JOURNEY_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/58 to-black/90" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_22%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
          <SectionHeader
            kicker="OUR JOURNEY"
            icon={<Rocket className="h-4 w-4" />}
            title="การเดินทางของพวกเรา"
            desc="แต่ละช่วงเวลา คือรากฐานของการเติบโต และพาเรามาถึงวันนี้"
            align="center"
          />

          {/* “cool” timeline cards */}
          <JourneyTimeline items={journey} />
        </div>
      </section>

      {/* =========================
          5) VALUES: background image + value cards
         ========================= */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${VALUES_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/86 via-black/62 to-black/92" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_35%,rgba(255,255,255,0.14),transparent_62%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-16">
          <div className="mx-auto max-w-[1100px] overflow-hidden rounded-[32px] bg-white/8 p-8 text-white backdrop-blur-xl shadow-[0_36px_160px_rgba(0,0,0,0.60)] sm:p-10">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90">
                <Sparkles className="h-4 w-4" />
                OUR VALUES
              </div>
              <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                ค่านิยมของเรา
              </h3>
              <p className="mx-auto mt-3 max-w-[75ch] text-sm text-white/80 sm:text-base">
                วัฒนธรรมที่ทำให้ทีมเดินไปด้วยกันได้เร็วและไกล — ทำงานจริง โตจริง และเคารพกัน
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {values.map((x) => (
                <ValueCard key={x.title} icon={x.icon} title={x.title} desc={x.desc} />
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/jobs"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "bg-white text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
                  "transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(0,0,0,0.55)] active:scale-[0.98]"
                )}
              >
                View open roles <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("about-us");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black",
                  "border border-white/18 bg-white/10 text-white backdrop-blur",
                  "transition hover:bg-white/16 hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                Back to About
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}