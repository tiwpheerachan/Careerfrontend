import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Building2,
  Layers3,
  Hash,
  Globe2,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { getJob, listJobs } from "@/lib/api"; // ✅ เพิ่ม listJobs
import type { Job, Language } from "@/lib/types";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full",
        "border border-slate-200 bg-white/90 px-3 py-1.5",
        "text-xs font-semibold text-slate-700",
        "shadow-[0_12px_30px_rgba(2,6,23,0.06)] backdrop-blur"
      )}
    >
      <span className="text-slate-600">{icon}</span>
      <span className="leading-none">{children}</span>
    </span>
  );
}

function Section({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  if (!body?.trim()) return null;
  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </span>
        <h2 className="text-sm font-black tracking-tight text-slate-900">{title}</h2>
      </div>

      <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{body}</div>
      </div>
    </section>
  );
}

function RecCard({ j }: { j: Job }) {
  const href = `/jobs/${encodeURIComponent(j.job_id)}`;

  return (
    <Link
      to={href}
      className={cn(
        "group block overflow-hidden rounded-3xl border border-slate-200 bg-white p-5",
        "shadow-[0_12px_40px_rgba(2,6,23,0.06)]",
        "transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_70px_rgba(2,6,23,0.10)]",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900 line-clamp-2">{j.title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {j.job_id}
            </span>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full",
            "border border-slate-200 bg-slate-50 px-2.5 py-1",
            "text-[11px] font-bold text-slate-700",
            "group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-700"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Match
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-semibold">{j.department}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white">
            <Layers3 className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-semibold">{j.level}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-semibold">{j.location}</span>
        </div>

        {j.country ? (
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Globe2 className="h-3.5 w-3.5" />
            </span>
            <span className="truncate font-semibold">{j.country}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 text-xs font-semibold text-slate-500">
        Click to view details →
      </div>
    </Link>
  );
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [job, setJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // ✅ เพิ่ม allJobs
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;

    setLoading(true);

    // ✅ ดึง Job detail + jobs list เพื่อทำ recommended
    Promise.all([getJob(jobId, lang), listJobs({ lang })])
      .then(([j, r]: any) => {
        if (!alive) return;
        setJob(j);

        // รองรับ response ได้หลายแบบ (array หรือ {jobs: []})
        const list = Array.isArray(r) ? (r as Job[]) : Array.isArray(r?.jobs) ? (r.jobs as Job[]) : [];
        setAllJobs(list);
      })
      .catch(() => {
        if (!alive) return;
        setJob(null);
        setAllJobs([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [jobId, lang]);

  const pageTitle = useMemo(
    () => (job ? `${job.title} • SHD Careers` : `Job • SHD Careers`),
    [job]
  );

  function onBack() {
    try {
      if (window.history.length > 1) nav(-1);
      else nav("/jobs");
    } catch {
      nav("/jobs");
    }
  }

  const applyHref = useMemo(() => {
    if (!job) return "/jobs";
    return `/jobs/${encodeURIComponent(job.job_id)}/apply`;
  }, [job]);

  // ✅ Recommended 8 jobs: prioritize same country+dept, then same country, then same dept
  const recommended = useMemo(() => {
    if (!job) return [];

    const norm = (v: any) => String(v ?? "").trim().toLowerCase();

    const jCountry = norm((job as any).country);
    const jDept = norm((job as any).department);
    const jLevel = norm((job as any).level);

    const scored = allJobs
      .filter((x) => x && x.job_id && x.job_id !== job.job_id)
      .map((x) => {
        const c = norm((x as any).country);
        const d = norm((x as any).department);
        const l = norm((x as any).level);

        let score = 0;

        // country + dept
        if (c && jCountry && c === jCountry) score += 40;
        if (d && jDept && d === jDept) score += 30;

        // level (soft match)
        if (l && jLevel && l === jLevel) score += 10;

        // location partial (optional)
        const locA = norm((job as any).location);
        const locB = norm((x as any).location);
        if (locA && locB && (locA.includes(locB) || locB.includes(locA))) score += 5;

        return { x, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.x);

    return scored;
  }, [job, allJobs]);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="bg-white">
        <div className="container-page pt-24 pb-16 md:pt-28">
          {/* ✅ TOP BAR */}
          <div
            className={cn("sticky top-[72px] z-[60] -mx-2 px-2", "md:top-[84px]")}
            style={{ pointerEvents: "auto" }}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                "rounded-2xl border border-slate-200 bg-white/92",
                "px-3 py-2 shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur"
              )}
            >
              <button
                type="button"
                onClick={onBack}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2",
                  "text-sm font-semibold text-slate-700",
                  "transition hover:bg-slate-50 active:bg-slate-100",
                  "focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60"
                )}
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                {t("common.back")}
              </button>

              {job ? (
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Hash className="h-4 w-4" />
                  <span className="text-slate-600">{job.job_id}</span>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-500">{t("common.loading")}</div>
              )}
            </div>
          </div>

          {/* HEADER */}
          <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_26px_90px_rgba(2,6,23,0.08)]">
            <div
              className="relative px-6 py-6 md:px-8 md:py-8"
              style={{
                background:
                  "radial-gradient(1200px 420px at 12% 10%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(900px 360px at 92% 0%, rgba(249,115,22,0.10), transparent 55%)",
              }}
            >
              {loading ? (
                <div className="text-sm font-semibold text-slate-600">{t("common.loading")}</div>
              ) : !job ? (
                <div className="text-sm text-slate-600">{t("common.notFound")}</div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                    <Sparkles className="h-4 w-4" />
                    {t("nav.jobs")}
                  </div>

                  <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    {job.title}
                  </h1>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill icon={<Building2 className="h-4 w-4" />}>{job.department}</Pill>
                    <Pill icon={<Layers3 className="h-4 w-4" />}>{job.level}</Pill>
                    <Pill icon={<MapPin className="h-4 w-4" />}>{job.location}</Pill>
                    {job.country ? <Pill icon={<Globe2 className="h-4 w-4" />}>{job.country}</Pill> : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BODY */}
          <div className="mt-6">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                <div className="text-sm text-slate-600">{t("common.loading")}</div>
                <div className="mt-4 space-y-3">
                  <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
                </div>
              </div>
            ) : !job ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600">
                {t("common.notFound")}
              </div>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                  {/* LEFT */}
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)] md:p-8">
                    <Section title="Description" body={job.description} icon={<BadgeCheck className="h-4 w-4" />} />
                    <Section title="Qualifications" body={job.qualifications} icon={<Sparkles className="h-4 w-4" />} />
                    <Section title="Responsibilities" body={job.responsibilities ?? ""} icon={<Briefcase className="h-4 w-4" />} />
                    <Section title="Benefits" body={job.benefits ?? ""} icon={<BadgeCheck className="h-4 w-4" />} />
                  </div>

                  {/* RIGHT (Desktop only) */}
                  <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start space-y-4">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)]">
                      <div className="text-sm font-black text-slate-900">{t("common.applyNow")}</div>
                      <div className="mt-2 text-sm leading-relaxed text-slate-600">
                        Apply with your basic information and attachments. The admin will receive your application automatically.
                      </div>

                      <div className="mt-4">
                        <Link
                          to={applyHref}
                          className={cn(
                            "inline-flex w-full items-center justify-center gap-2",
                            "rounded-2xl px-4 py-3 text-sm font-extrabold",
                            "bg-blue-600 text-white shadow-[0_18px_50px_rgba(37,99,235,0.32)]",
                            "transition hover:bg-blue-700 active:bg-blue-800",
                            "hover:-translate-y-0.5 active:translate-y-0",
                            "focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60"
                          )}
                        >
                          <Briefcase className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                          {t("common.applyNow")}
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)]">
                      <div className="text-xs font-semibold text-slate-500">Job ID</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{job.job_id}</div>
                      <div className="mt-4 text-xs font-semibold text-slate-500">Country</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{job.country}</div>
                    </div>
                  </aside>
                </div>

                {/* ✅ RECOMMENDED JOBS */}
                {recommended.length > 0 && (
                  <section className="mt-10">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          <Sparkles className="h-4 w-4" />
                          Recommended for you
                        </div>
                        <h2 className="mt-2 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                          Similar openings you may like
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          Based on country / department / level similarity.
                        </p>
                      </div>

                      <Link
                        to="/jobs"
                        className={cn(
                          "hidden sm:inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold",
                          "border border-slate-200 bg-white text-slate-800",
                          "transition hover:bg-slate-50 active:bg-slate-100"
                        )}
                      >
                        View all jobs
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {recommended.map((j) => (
                        <RecCard key={j.job_id} j={j} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>

        {/* ✅ MOBILE: sticky bottom apply */}
        {!loading && job ? (
          <div className="lg:hidden">
            <div className="fixed inset-x-0 bottom-0 z-[70]">
              <div className="mx-auto w-full max-w-[1280px] px-4 pb-4">
                <div
                  className={cn(
                    "rounded-3xl border border-slate-200 bg-white/92",
                    "shadow-[0_30px_90px_rgba(2,6,23,0.18)] backdrop-blur",
                    "p-3"
                  )}
                >
                  <Link
                    to={applyHref}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2",
                      "rounded-2xl px-4 py-3 text-sm font-extrabold",
                      "bg-blue-600 text-white",
                      "transition hover:bg-blue-700 active:bg-blue-800",
                      "hover:-translate-y-0.5 active:translate-y-0",
                      "focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/60"
                    )}
                  >
                    <Briefcase className="h-5 w-5" />
                    {t("common.applyNow")}
                  </Link>

                  <div className="mt-2 text-center text-xs text-slate-500">
                    Apply with your basic information and attachments.
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[108px]" />
          </div>
        ) : null}
      </section>
    </>
  );
}
