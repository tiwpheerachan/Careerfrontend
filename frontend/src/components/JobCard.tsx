import { Link } from "react-router-dom";
import { MapPin, Building2, Layers3, ArrowRight, Users } from "lucide-react";
import type { Job } from "@/lib/types";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: Job }) {
  const { t } = useTranslation();
  const href = `/jobs/${encodeURIComponent(job.job_id)}`;

  const quantity = typeof (job as any).quantity === "number" ? (job as any).quantity : 0;

  // ✅ i18n labels (with safe defaults)
  const positionOne = t("jobs.card.position_one", { defaultValue: "Position" });
  const positionOther = t("jobs.card.position_other", { defaultValue: "Positions" });
  const hiringLabel = t("jobs.card.hiring", { defaultValue: "Hiring" });

  return (
    <Link
      to={href}
      className={[
        "group relative w-full block",
        "min-h-[150px]",
        "rounded-[24px] bg-white",
        "px-5 py-5 sm:px-6 sm:py-6",
        "border-2 border-slate-200/70",
        "shadow-[0_8px_24px_rgba(2,6,23,0.08)]",
        "transition-all duration-300 ease-out",
        "hover:border-[#F59E0B]/40",
        "hover:-translate-y-1",
        "hover:shadow-[0_16px_40px_rgba(245,158,11,0.15)]",
        "active:scale-[0.99]",
        "touch-manipulation cursor-pointer select-none",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F59E0B]/40",
      ].join(" ")}
    >
      {/* Top Section */}
      <div className="mb-3 flex items-start justify-between gap-4">
        {/* Title + Quantity */}
        <div className="min-w-0 flex-1">
          <h3
            className={[
              "text-[17px] sm:text-[18px] md:text-[19px]",
              "leading-[1.3]",
              "font-extrabold tracking-[-0.01em]",
              "text-[#1565C0]",
              "transition-colors duration-200",
              "group-hover:text-[#F59E0B]",
            ].join(" ")}
          >
            <span className="line-clamp-2 break-words">{job.title}</span>
          </h3>

          {/* 🔥 Quantity Badge */}
          <div className="mt-2 flex items-center gap-2">
            {quantity > 0 ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600">
                <Users className="h-3.5 w-3.5" />
                {quantity} {quantity === 1 ? positionOne : positionOther}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-3 py-1 text-[12px] font-semibold text-[#F59E0B]">
                <Users className="h-3.5 w-3.5" />
                {hiringLabel}
              </div>
            )}
          </div>
        </div>

        {/* View Detail Badge */}
        <div
          className={[
            "shrink-0",
            "inline-flex items-center gap-1.5",
            "rounded-full bg-[#F59E0B]/10",
            "px-3 py-1.5",
            "text-[#F59E0B] font-semibold text-[12px]",
            "border border-[#F59E0B]/20",
            "transition-all duration-200",
            "group-hover:bg-[#F59E0B]",
            "group-hover:text-white",
          ].join(" ")}
        >
          <span>{t("common.viewDetail", { defaultValue: "View detail" })}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Meta Row */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        <MetaPill
          icon={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E5BD7] text-white shadow-sm transition-transform group-hover:scale-110">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          }
          text={job.department}
        />

        <MetaPill
          icon={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-sm transition-transform group-hover:scale-110">
              <Layers3 className="h-3.5 w-3.5" />
            </span>
          }
          text={job.level}
        />

        <MetaPill
          icon={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:scale-110">
              <MapPin className="h-3.5 w-3.5" />
            </span>
          }
          text={job.location}
        />
      </div>
    </Link>
  );
}

function MetaPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700 transition-colors group-hover:text-slate-900 sm:text-[13px]">
        {text}
      </span>
    </div>
  );
}
