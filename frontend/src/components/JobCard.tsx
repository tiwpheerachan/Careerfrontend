import { Link } from "react-router-dom";
import { MapPin, Building2, Layers3 } from "lucide-react";
import type { Job } from "@/lib/types";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: Job }) {
  const { t } = useTranslation();
  const href = `/jobs/${encodeURIComponent(job.job_id)}`;

  return (
    <div
      className={[
        "relative w-full",
        "rounded-[24px] bg-white",
        "px-5 py-4 sm:px-6 sm:py-5", // ✅ กระชับลง
        "ring-1 ring-slate-200/70",
        "shadow-[0_12px_30px_rgba(2,6,23,0.09)]",
        "transition",
        "hover:-translate-y-[1px] hover:shadow-[0_16px_40px_rgba(2,6,23,0.11)]",
      ].join(" ")}
    >
      {/* title + CTA */}
      <div className="flex items-start justify-between gap-3">
        <Link to={href} className="min-w-0 flex-1">
          <div
            className={[
              "min-w-0",
              "text-[18px] sm:text-[19px] md:text-[20px]", // ✅ ลดขนาด title
              "leading-[1.2]",
              "font-extrabold tracking-[-0.01em]",
              "text-[#1565C0] hover:text-[#0B4AA5]",
            ].join(" ")}
          >
            <span className="line-clamp-2 break-words">{job.title}</span>
          </div>
        </Link>

        <Link
          to={href}
          className={[
            "shrink-0",
            "rounded-full bg-[#F59E0B]",
            "px-3.5 py-[6px]", // ✅ ปุ่มเล็กลง
            "text-white font-semibold text-[13px] sm:text-[13.5px]",
            "shadow-sm",
            "transition hover:bg-[#F08C00]",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F59E0B]/30",
            "whitespace-nowrap",
          ].join(" ")}
        >
          {t("common.viewDetail")}
        </Link>
      </div>

      {/* meta row: 3 items inline + truncate when long */}
      <div
        className={[
          "mt-3",
          "grid gap-3",
          "grid-cols-1",
          "sm:grid-cols-2",
          "md:grid-cols-3", // ✅ 3 ช่องเรียงกันเหมือนรูป
        ].join(" ")}
      >
        <MetaPill
          icon={
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1E5BD7] text-white shadow-sm">
              <Building2 className="h-4 w-4" />
            </span>
          }
          text={job.department}
        />

        <MetaPill
          icon={
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-sm">
              <Layers3 className="h-4 w-4" />
            </span>
          }
          text={job.level}
        />

        <MetaPill
          icon={
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
              <MapPin className="h-4 w-4" />
            </span>
          }
          text={job.location}
        />
      </div>
    </div>
  );
}

/** ✅ ทำให้ truncate ทำงานเสมอ + ฟอนต์เล็กลง */
function MetaPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {icon}
      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-[13.5px] text-slate-900">
        {text}
      </span>
    </div>
  );
}
