// frontend/src/pages/HomePage.tsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Flag,
  ChevronDown,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

import { listJobs } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

/** ✅ 3D Globe deps */
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/** =========================================================
 * ✅ HERO BACKGROUND (Desktop vs Mobile)
 * ✅ ตามที่ขอ: "ไม่ต้องเปลี่ยนรูปตอนเม้าแตะ" → ใช้แค่ 1 รูปต่อ device
 * ========================================================= */
const HERO_BG_DESKTOP = "/images/5_07_Charge_Faster_Clean_Longer_1200x.webp"; // ✅ desktop
const HERO_BG_MOBILE = "/images/hero/mobile/hero-1.webp"; // ✅ mobile (แนวตั้ง)

/** ---------- Smart UI card ---------- */
function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
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

/** ---------- Office config ---------- */
type Office = {
  key: string;
  label: string;
  countryValueMatch: string[];
  flagEmoji?: string;
  bgImage: string; // desktop/tablet
  bgImageMobile?: string; // ✅ mobile portrait background (optional)
  portraitImage: string; // legacy (คงไว้ตามเดิม)
  tagline?: string;
  lat: number;
  lng: number;
};

const OFFICES: Office[] = [
  {
    key: "TH",
    label: "Thailand",
    countryValueMatch: ["TH", "Thailand", "ไทย", "Bangkok"],
    flagEmoji: "🇹🇭",
    bgImage: "/images/offices/th-bg.jpg",
    bgImageMobile: "/images/offices/mobile/th-bg.jpg",
    portraitImage: "/images/offices/th-portrait.jpg",
    tagline: "Bangkok • Local excellence to global scale",
    lat: 13.7563,
    lng: 100.5018,
  },
  {
    key: "CN",
    label: "China",
    countryValueMatch: ["CN", "China", "จีน"],
    flagEmoji: "🇨🇳",
    bgImage: "/images/offices/cn-bg.jpg",
    bgImageMobile: "/images/offices/mobile/cn-bg.jpg",
    portraitImage: "/images/offices/cn-portrait.jpg",
    tagline: "Innovation hub • Supply chain & product",
    lat: 31.2304,
    lng: 121.4737,
  },
  {
    key: "ID",
    label: "Indonesia",
    countryValueMatch: ["ID", "Indonesia", "อินโดนีเซีย"],
    flagEmoji: "🇮🇩",
    bgImage: "/images/offices/id-bg.jpg",
    bgImageMobile: "/images/offices/mobile/id-bg.jpg",
    portraitImage: "/images/offices/id-portrait.jpg",
    tagline: "SEA growth • Marketplace acceleration",
    lat: -6.2088,
    lng: 106.8456,
  },
  {
    key: "PH",
    label: "Philippines",
    countryValueMatch: ["PH", "Philippines", "ฟิลิปปินส์"],
    flagEmoji: "🇵🇭",
    bgImage: "/images/offices/ph-bg.jpg",
    bgImageMobile: "/images/offices/mobile/ph-bg.jpg",
    portraitImage: "/images/offices/ph-portrait.jpg",
    tagline: "Operations • Customer experience",
    lat: 14.5995,
    lng: 120.9842,
  },
  {
    key: "VN",
    label: "Vietnam",
    countryValueMatch: ["VN", "Vietnam", "เวียดนาม"],
    flagEmoji: "🇻🇳",
    bgImage: "/images/offices/vn-bg.jpg",
    bgImageMobile: "/images/offices/mobile/vn-bg.jpg",
    portraitImage: "/images/offices/vn-portrait.jpg",
    tagline: "Regional team • Logistics & growth",
    lat: 21.0278,
    lng: 105.8342,
  },
  {
    key: "BR",
    label: "Brazil",
    countryValueMatch: ["BR", "Brazil", "บราซิล"],
    flagEmoji: "🇧🇷",
    bgImage: "/images/offices/br-bg.jpg",
    bgImageMobile: "/images/offices/mobile/br-bg.jpg",
    portraitImage: "/images/offices/br-portrait.jpg",
    tagline: "LATAM • Go-to-market & distribution",
    lat: -23.5505,
    lng: -46.6333,
  },
  {
    key: "MX",
    label: "Mexico",
    countryValueMatch: ["MX", "Mexico", "เม็กซิโก"],
    flagEmoji: "🇲🇽",
    bgImage: "/images/offices/mx-bg.jpg",
    bgImageMobile: "/images/offices/mobile/mx-bg.jpg",
    portraitImage: "/images/offices/mx-portrait.jpg",
    tagline: "LATAM expansion • Partnerships",
    lat: 19.4326,
    lng: -99.1332,
  },
];

/** ---------- Horizontal 16:8 gallery images (17 boxes) ---------- */
const GALLERY_16x8: string[] = Array.from({ length: 17 }).map(
  (_, i) => `/images/gallery/g${i + 1}.jpg`
);

/** =========================================================
 *  ✅ 3D Globe (day style)
 * ========================================================= */

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ✅ ErrorBoundary กันกรณี texture path ผิด / loader error แล้วหน้าขาว */
class R3FErrorBoundary extends React.Component<
  { fallback?: React.ReactNode; children?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback?: React.ReactNode; children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: any) {
    console.error("Globe render error:", err);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children ?? null;
  }
}

function GlobeFallbackCard({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="rounded-2xl border border-white/35 bg-black/35 px-4 py-3 text-xs font-semibold text-white backdrop-blur">
        {label}
        <div className="mt-1 text-[11px] font-medium text-white/70">
          Check: /public/images/offices/globe/earth_day.jpg
        </div>
      </div>
    </div>
  );
}

/** ✅ Pin component: glow + pulse ring (active) */
function GlobePin({
  o,
  active,
  onSelect,
  radius,
}: {
  o: Office;
  active: boolean;
  onSelect: (k: string) => void;
  radius: number;
}) {
  const pos = useMemo(() => latLngToVec3(o.lat, o.lng, radius * 1.02), [o.lat, o.lng, radius]);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current && ringMatRef.current) {
      if (!active) {
        ringRef.current.scale.setScalar(0.0001);
        ringMatRef.current.opacity = 0;
      } else {
        const p = (Math.sin(t * 3.2) + 1) * 0.5; // 0..1
        const s = 1.0 + p * 0.9;
        ringRef.current.scale.setScalar(s);
        ringMatRef.current.opacity = 0.26 - p * 0.11;
      }
    }

    if (headRef.current) {
      headRef.current.scale.setScalar(active ? 1.0 + Math.sin(t * 6) * 0.01 : 1.0);
    }
  });

  return (
    <group position={pos.toArray()}>
      {/* stem */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(o.key);
        }}
      >
        <cylinderGeometry args={[0.0055, 0.0055, 0.11, 10]} />
        <meshStandardMaterial
          color={active ? "#10b981" : "#ffffff"}
          transparent
          opacity={active ? 0.95 : 0.62}
          emissive={active ? new THREE.Color("#10b981") : new THREE.Color("#ffffff")}
          emissiveIntensity={active ? 0.55 : 0.08}
        />
      </mesh>

      {/* head */}
      <mesh
        ref={headRef}
        position={[0, 0.065, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(o.key);
        }}
      >
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial
          color={active ? "#10b981" : "#ffffff"}
          emissive={active ? new THREE.Color("#10b981") : new THREE.Color("#ffffff")}
          emissiveIntensity={active ? 0.9 : 0.12}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* pulse ring (active only) */}
      <mesh
        ref={ringRef}
        position={[0, 0.065, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={999}
      >
        <ringGeometry args={[0.028, 0.05, 40]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={"#34d399"}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Label */}
      <Html distanceFactor={6} position={[0.052, 0.12, 0]}>
        <button
          type="button"
          onClick={() => onSelect(o.key)}
          className={cn(
            "pointer-events-auto select-none",
            "transition active:scale-[0.98]",
            active
              ? cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap",
                  "rounded-full bg-black/30 px-2.5 py-1 text-[10px] md:text-[11px] font-semibold text-white backdrop-blur",
                  "shadow-[0_10px_26px_rgba(0,0,0,0.18)]",
                  "ring-2 ring-emerald-300/55"
                )
              : cn(
                  "hidden sm:inline-flex items-center justify-center",
                  "h-6 w-6 rounded-full bg-black/18 text-[11px] text-white/90 backdrop-blur",
                  "shadow-[0_10px_20px_rgba(0,0,0,0.12)]",
                  "hover:bg-black/26"
                )
          )}
        >
          <span>{o.flagEmoji ?? "•"}</span>
          {active ? <span className="max-w-[120px] truncate">{o.label}</span> : null}
        </button>
      </Html>
    </group>
  );
}

function GlobeScene({
  offices,
  activeKey,
  onSelect,
}: {
  offices: Office[];
  activeKey: string;
  onSelect: (k: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const radius = 0.85;

  const earthDay = useTexture("/images/offices/globe/earth_day.jpg");
  const earthNight = useTexture("/images/offices/globe/earth_night.jpg");

  useEffect(() => {
    earthDay.colorSpace = THREE.SRGBColorSpace;
    earthDay.anisotropy = 8;
    earthDay.wrapS = THREE.ClampToEdgeWrapping;
    earthDay.wrapT = THREE.ClampToEdgeWrapping;
  }, [earthDay]);

  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.current.x = nx;
      pointer.current.y = ny;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const targetQuat = useRef(new THREE.Quaternion());
  const currentQuat = useRef(new THREE.Quaternion());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    currentQuat.current.copy(g.quaternion);
    targetQuat.current.copy(g.quaternion);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const of = offices.find((o) => o.key === activeKey);
    if (!of) return;

    const pin = latLngToVec3(of.lat, of.lng, 1.0).normalize();
    const front = new THREE.Vector3(0, 0, 1);

    const q = new THREE.Quaternion().setFromUnitVectors(pin, front);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0));
    q.multiply(tilt);

    targetQuat.current.copy(q);
    controlsRef.current?.update?.();
  }, [activeKey, offices, ready]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;

    const idleSpin = dt * 0.055;

    const tx = clamp(pointer.current.y * 0.12, -0.12, 0.12);
    const ty = clamp(pointer.current.x * 0.14, -0.14, 0.14);

    const pointerQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tx, ty, 0));
    const spinQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), idleSpin);

    const composedTarget = targetQuat.current.clone().multiply(pointerQ).multiply(spinQ);

    const t = 1 - Math.exp(-dt * 3.8);
    currentQuat.current.slerp(composedTarget, t);
    g.quaternion.copy(currentQuat.current);
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#bfe6ff", "#0b1020", 0.65]} />
      <directionalLight position={[3, 2, 2]} intensity={1.25} />
      <directionalLight position={[-3, -1, -2]} intensity={0.45} />
      <directionalLight position={[0.5, 0.2, -4]} intensity={0.75} />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial
            map={earthDay}
            emissive={"#ffffff"}
            emissiveMap={earthNight}
            emissiveIntensity={0.9}
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[radius * 1.045, 64, 64]} />
          <meshStandardMaterial
            color="#9ddcff"
            transparent
            opacity={0.10}
            emissive="#7bd3ff"
            emissiveIntensity={0.24}
          />
        </mesh>

        {offices.map((o) => (
          <GlobePin
            key={o.key}
            o={o}
            active={o.key === activeKey}
            onSelect={onSelect}
            radius={radius}
          />
        ))}
      </group>

      <OrbitControls ref={controlsRef} enablePan={false} enableZoom={false} rotateSpeed={0.6} />
    </>
  );
}

function Globe3D({
  offices,
  activeKey,
  onSelect,
  t,
}: {
  offices: Office[];
  activeKey: string;
  onSelect: (k: string) => void;
  t: (key: string, opts?: any) => string;
}) {
  return (
    <div className="relative min-w-0">
      <div className="relative w-full">
        <div className="relative h-[320px] w-full p-3 sm:h-[460px] sm:p-4 md:h-[560px] lg:h-[600px]">
          <div className="relative h-full w-full">
            <R3FErrorBoundary fallback={<GlobeFallbackCard label={t("common.loading")} />}>
              <Canvas
                camera={{ position: [0, 0, 3.05], fov: 42 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
              >
                <R3FErrorBoundary
                  fallback={
                    <Html center>
                      <div className="rounded-2xl border border-white/30 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                        {t("common.loading")}
                      </div>
                    </Html>
                  }
                >
                  <Suspense
                    fallback={
                      <Html center>
                        <div className="rounded-2xl border border-white/30 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                          {t("common.loading")}
                        </div>
                      </Html>
                    }
                  >
                    <GlobeScene offices={offices} activeKey={activeKey} onSelect={onSelect} />
                  </Suspense>
                </R3FErrorBoundary>
              </Canvas>
            </R3FErrorBoundary>

            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(70%_60%_at_50%_30%,rgba(255,255,255,0.14),transparent_65%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(65%_55%_at_35%_40%,rgba(16,185,129,0.10),transparent_62%)]" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-700"></div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const nav = useNavigate();

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [officeKey, setOfficeKey] = useState<string>(OFFICES[0]?.key ?? "TH");
  const office = useMemo(() => OFFICES.find((o) => o.key === officeKey) ?? OFFICES[0], [officeKey]);

  const OFFICE_PAGE_SIZE = 4;
  const [officePage, setOfficePage] = useState(1);

  function selectOffice(nextKey: string) {
    setOfficeKey(nextKey);
    setOfficePage(1);
  }

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

  const officeTotalPages = useMemo(
    () => Math.max(1, Math.ceil(officeJobs.length / OFFICE_PAGE_SIZE)),
    [officeJobs.length]
  );

  const officePagedJobs = useMemo(() => {
    const p = Math.max(1, Math.min(officePage, officeTotalPages));
    const start = (p - 1) * OFFICE_PAGE_SIZE;
    return officeJobs.slice(start, start + OFFICE_PAGE_SIZE);
  }, [officeJobs, officePage, officeTotalPages]);

  useEffect(() => {
    setOfficePage(1);
  }, [officeKey]);

  useEffect(() => {
    setOfficePage((p) => Math.min(Math.max(1, p), officeTotalPages));
  }, [officeTotalPages]);

  function goToDept(dept: string) {
    const sp = new URLSearchParams();
    sp.set("department", dept);
    nav(`/jobs?${sp.toString()}`);
  }

  function goToOfficeJobs(of: Office) {
    const sp = new URLSearchParams();
    sp.set("country", of.key);
    nav(`/jobs?${sp.toString()}`);
  }

  const galleryTop = useMemo(() => GALLERY_16x8.filter((_, i) => i % 2 === 0), []);
  const galleryBottom = useMemo(() => GALLERY_16x8.filter((_, i) => i % 2 === 1), []);
  const topTrack = useMemo(() => [...galleryTop, ...galleryTop], [galleryTop]);
  const bottomTrack = useMemo(() => [...galleryBottom, ...galleryBottom], [galleryBottom]);

  const heroRef = useRef<HTMLElement | null>(null);

  return (
    <>
      <Helmet>
        <title>{t("home.meta.title")}</title>
        <meta name="description" content={t("home.meta.description")} />
      </Helmet>

      {/* ===========================
          HERO
          ✅ 1 รูปต่อ device (mobile/desktop) — ไม่มี hover เปลี่ยนรูปแล้ว
      =========================== */}
      <section
        ref={(n) => (heroRef.current = n)}
        className="group relative isolate overflow-hidden bg-slate-950"
        onMouseMove={(e) => {
          const el = heroRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          el.style.setProperty("--mx", `${x}%`);
          el.style.setProperty("--my", `${y}%`);
        }}
      >
        {/* FULL-BLEED BACKGROUND (Responsive swap) */}
        <div className="absolute inset-0">
          {/* ✅ Mobile background (<640px) */}
          <img
            src={HERO_BG_MOBILE}
            alt=""
            className={cn("sm:hidden absolute inset-0 h-full w-full object-cover", "scale-[1.03]")}
            draggable={false}
          />

          {/* ✅ Desktop background (>=640px) */}
          <img
            src={HERO_BG_DESKTOP}
            alt=""
            className={cn("hidden sm:block absolute inset-0 h-full w-full object-cover", "scale-[1.03]")}
            draggable={false}
          />

          {/* overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_30%,rgba(255,215,120,0.22),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_35%,rgba(255,170,150,0.18),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_22%,rgba(255,255,255,0.22),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_76%_18%,rgba(56,189,248,0.22),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_78%_70%,rgba(168,85,247,0.20),transparent_62%)]" />

          <div
            className="absolute inset-0 opacity-[0.18] mix-blend-overlay bg-cover bg-center"
            style={{ backgroundImage: "url(/images/impact/impact-1.jpg)" }}
          />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* MOUSE SPOTLIGHT */}
        <div
          className={cn("pointer-events-none absolute inset-0 opacity-100")}
          style={{
            background:
              "radial-gradient(520px 360px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.14), rgba(255,255,255,0.06) 40%, transparent 70%)",
          }}
        />

        {/* CONTENT */}
        <div className="container-page relative py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[920px] text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.65)]" />
              {t("home.brandBadge")}
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("home.headline")}
            </h1>

            <p className="mx-auto mt-4 max-w-[70ch] text-base leading-relaxed text-white/80 sm:text-lg">
              {t("home.subhead")}
            </p>

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

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/75">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Briefcase className="h-3.5 w-3.5" />
                {loadingJobs ? t("home.chips.jobsLoading") : t("home.chips.openings", { count: totalOpenings })}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Globe2 className="h-3.5 w-3.5" />
                {t("home.chips.regions")}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.chips.experience")}
              </span>
            </div>

            <p className="mt-5 text-xs text-white/55">{t("home.bannerNote")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Globe2 className="h-5 w-5" />}
              title={t("home.features.multiCountry.title")}
              desc={t("home.features.multiCountry.desc")}
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title={t("home.features.languages.title")}
              desc={t("home.features.languages.desc")}
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t("home.features.professional.title")}
              desc={t("home.features.professional.desc")}
            />
            <Feature
              icon={<Briefcase className="h-5 w-5" />}
              title={t("home.features.structured.title")}
              desc={t("home.features.structured.desc")}
            />
          </div>
        </div>
      </section>

      {/* ===========================
          OFFICES (Grow around the world)
          ✅ สลับรูป per office ระหว่าง mobile/desktop ด้วย <picture>
          ✅ ไม่มีช่องว่างกับ HERO
      =========================== */}
      <section className="relative pt-0 -mt-px">
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="relative overflow-hidden rounded-none">
            <div className="relative min-h-[260px] md:min-h-[240px] lg:min-h-[220px]">
              {/* ✅ BG: swap per device */}
              <picture>
                {/* 📌 มือถือ: ใส่รูปที่ /public/images/offices/mobile/<key>-bg.jpg */}
                <source media="(max-width: 640px)" srcSet={office.bgImageMobile ?? office.bgImage} />
                {/* 📌 เดสก์ท็อป: /public/images/offices/<key>-bg.jpg */}
                <img
                  src={office.bgImage}
                  alt={t("home.offices.badges.office") + ` ${office.label}`}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    "scale-[1.03] will-change-transform",
                    "animate-[fadeIn_700ms_ease-out]"
                  )}
                  draggable={false}
                />
              </picture>

              {/* overlays */}
              <div className="absolute inset-0 bg-[radial-gradient(75%_70%_at_50%_18%,rgba(255,255,255,0.78),transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_18%_35%,rgba(16,185,129,0.14),transparent_62%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/0" />

              {/* header */}
              <div className="relative z-10">
                <div className="container-page px-4 pt-10 md:pt-14">
                  <div className="mx-auto max-w-[1020px] text-center">
                    <div className="text-xs font-semibold tracking-wide text-emerald-700">
                      {t("home.offices.kicker")}
                    </div>

                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                      {t("home.offices.title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-700">{t("home.offices.subtitle")}</p>

                    {/* dropdown row */}
                    <div className="mx-auto mt-6 flex max-w-[720px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                      <div className="relative w-full sm:w-[460px]">
                        <select
                          aria-label={t("home.offices.dropdownAria")}
                          className="w-full appearance-none rounded-2xl border border-white/55 bg-white/45 px-4 py-3 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-200 focus:ring-4 focus:ring-emerald-100"
                          value={officeKey}
                          onChange={(e) => selectOffice(e.target.value)}
                        >
                          {OFFICES.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.flagEmoji ? `${o.flagEmoji} ` : ""}
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                      </div>

                      <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-900">
                        <Briefcase className="h-4 w-4 text-slate-800" />
                        {loadingJobs
                          ? t("home.offices.openingsLoading")
                          : t("home.offices.openings", { count: officeJobsCount })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* mobile chips */}
              <div className="absolute left-0 right-0 top-4 z-20 px-4 md:hidden">
                <div
                  className={cn(
                    "flex gap-2 overflow-x-auto",
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
                        onClick={() => selectOffice(o.key)}
                        className={cn(
                          "shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                          "active:scale-[0.98]",
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_10px_26px_rgba(16,185,129,0.20)]"
                            : "border-white/55 bg-white/20 text-slate-900 hover:bg-white/35"
                        )}
                      >
                        <span className="mr-1">{o.flagEmoji ?? "🏳️"}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* content */}
              <div className="relative z-10">
                <div className="mx-auto w-full max-w-[1760px] px-4 pt-0 pb-4 sm:px-6 md:px-10 md:pb-6 lg:px-16">
                  <div className="mt-7 md:mt-9 lg:mt-10">
                    <div className="w-full">
                      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,920px)_minmax(0,520px)] md:gap-14 xl:gap-16">
                        {/* LEFT: Globe */}
                        <div className="min-w-0 pt-0 md:pt-1 animate-[rise_700ms_cubic-bezier(.2,.8,.2,1)] flex items-start justify-center">
                          <div className="w-full px-0 sm:px-4 md:px-5 lg:px-6">
                            <div className="sm:-translate-y-[6%] md:-translate-y-[8%]">
                              <Globe3D
                                offices={OFFICES}
                                activeKey={officeKey}
                                onSelect={(k) => selectOffice(k)}
                                t={t}
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: jobs card */}
                        <div
                          className={cn(
                            "min-w-0 pt-0 md:pt-2 mt-2 md:mt-10",
                            "border-0 bg-transparent p-0 backdrop-blur-0 shadow-none",
                            "shadow-[0_28px_120px_rgba(0,0,0,0.10)]",
                            "md:-translate-x-6 lg:-translate-x-10"
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                              <Flag className="h-3.5 w-3.5" />
                              <span className="mr-1">{office.flagEmoji ?? "🏳️"}</span>
                              {office.label}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {office.tagline ?? t("home.offices.badges.taglineFallback")}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {loadingJobs ? "…" : t("home.offices.badges.openings", { count: officeJobsCount })}
                            </span>
                          </div>

                          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                            {t("home.offices.cardTitle")}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">{t("home.offices.cardSubtitle")}</div>

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
                                          {dept}
                                          {t("home.offices.jobCard.deptLevelSep")}
                                          {lvl}
                                        </div>
                                      </div>
                                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
                                    </div>
                                  </Link>
                                );
                              })
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setOfficePage((p) => Math.max(1, p - 1))}
                              disabled={officePage <= 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              {t("home.offices.pagination.prev")}
                            </button>

                            <div className="text-xs font-semibold text-slate-800">
                              {t("home.offices.pagination.page", { page: officePage, total: officeTotalPages })}
                            </div>

                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setOfficePage((p) => Math.min(officeTotalPages, p + 1))}
                              disabled={officePage >= officeTotalPages}
                            >
                              {t("home.offices.pagination.next")}
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => goToOfficeJobs(office)}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black",
                                "bg-[#cd902e] text-white",
                                "shadow-[0_18px_60px_rgba(111,87,48,0.35)]",
                                "transition hover:-translate-y-0.5 hover:bg-[#c39227e2]",
                                "active:scale-[0.98]"
                              )}
                            >
                              {t("home.offices.actions.viewAllInOffice", { office: office.label })}
                              <ArrowRight className="h-4 w-4" />
                            </button>

                            <Link
                              to="/jobs"
                              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {t("home.offices.actions.goAllJobs")}
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-center text-xs text-slate-700"></div>
                    </div>
                  </div>
                </div>
              </div>

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

{/* FIND YOUR FIT */}
<section className="container-page py-16">
  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
    <div>
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
          "border border-[#6f5730]/30 bg-[#6f5730]/10 text-[#6f5730]"
        )}
      >
        <Briefcase className="h-4 w-4" />
        {t("home.findYourFit.badge", { defaultValue: "Find your fit" })}
      </div>

      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
        {t("home.findYourFit.title", {
          defaultValue: "Find your direction",
        })}
      </h2>

      <p className="mt-2 max-w-xl text-sm text-slate-600">
        {t("home.findYourFit.desc", {
          defaultValue:
            "Based on real openings — choose a department to see available roles.",
        })}
      </p>
    </div>

    <Link
      to="/jobs"
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black",
        "bg-[#6f5730] text-white",
        "shadow-[0_16px_50px_rgba(111,87,48,0.35)]",
        "transition hover:-translate-y-0.5 hover:bg-[#5f4a28] active:scale-[0.97]"
      )}
    >
      {t("home.findYourFit.ctaAllJobs", {
        defaultValue: "View all jobs",
      })}
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>

  {/* Error */}
  {jobsError && (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {t("home.findYourFit.errorPrefix", {
        defaultValue: "Error:",
      })}{" "}
      {String(jobsError)}
    </div>
  )}

  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {loadingJobs ? (
      Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[120px] animate-pulse rounded-3xl bg-slate-100" />
      ))
    ) : deptCounts.length === 0 ? (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {t("home.findYourFit.noJobs", {
          defaultValue: "No jobs available.",
        })}
      </div>
    ) : (
      deptCounts.map(([dept, count]) => (
        <button
          key={dept}
          type="button"
          onClick={() => goToDept(dept)}
          className={cn(
            "group relative overflow-hidden rounded-3xl p-6 text-left",
            "border border-slate-200 bg-white",
            "transition-all duration-300",
            "hover:-translate-y-1 hover:border-[#6f5730]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]",
            "active:scale-[0.98]"
          )}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6f5730]/10 via-transparent to-transparent" />
          </div>

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">{dept}</div>

              {/* ✅ Hiring Line ตรง JSON ของคุณ */}
              <div className="mt-1 text-sm text-slate-600">
                {t("home.findYourFit.card.hiring", {
                  defaultValue: "Hiring",
                })}{" "}
                <span className="font-black text-slate-900">
                  {count}
                </span>{" "}
                {t("home.findYourFit.card.roleUnit", {
                  defaultValue: "roles",
                })}
              </div>
            </div>

            <div
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                "border border-slate-200 bg-slate-50 text-slate-700",
                "transition-all duration-300",
                "group-hover:border-[#6f5730]/40 group-hover:bg-[#6f5730] group-hover:text-white",
                "group-hover:translate-x-0.5"
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
              <Users className="h-3.5 w-3.5" />{" "}
              {t("home.findYourFit.card.teamChip", {
                defaultValue: "Team",
              })}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
              <Briefcase className="h-3.5 w-3.5" />{" "}
              {t("home.findYourFit.card.openingsChip", {
                defaultValue: "Openings",
              })}
            </span>
          </div>
        </button>
      ))
    )}
  </div>

  <div className="mt-5 text-xs text-slate-500">
    {t("home.findYourFit.footnote", {
      defaultValue:
        "* Click a card to go to Jobs page with department filter.",
    })}
  </div>
</section>


      {/* GALLERY / PARTNERS */}
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
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
              <Sparkles className="h-4 w-4" />
              {t("home.gallery.badge")}
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              {t("home.gallery.title")}
            </h2>

            <p className="mt-2 text-sm text-slate-600">{t("home.gallery.desc")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white/70 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur">
          <div className="p-4 md:p-5">
            {/* Row 1 */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/80 to-white/0" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/80 to-white/0" />

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
                      <div className="w-[160px] sm:w-[190px] md:w-[220px]">
                        <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                          <div className="relative aspect-[16/8]">
                            <img
                              src={src}
                              alt={t("home.gallery.imageAltTop", { n: idx + 1 })}
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
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/80 to-white/0" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/80 to-white/0" />

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
                              alt={t("home.gallery.imageAltBottom", { n: idx + 1 })}
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
