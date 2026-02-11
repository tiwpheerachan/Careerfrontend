import { Link } from "react-router-dom";
import { MapPin, Building2, Layers3, ArrowRight } from "lucide-react";
import type { Job } from "@/lib/types";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: Job }) {
  const { t } = useTranslation();
  const href = `/jobs/${encodeURIComponent(job.job_id)}`;

  return (
    <Link
      to={href}
      className={[
        // Layout
        "group relative w-full block",
        "min-h-[140px]", // ✅ ให้การ์ดมีความสูงขั้นต่ำ
        // Style
        "rounded-[24px] bg-white",
        "px-5 py-5 sm:px-6 sm:py-6", // ✅ เพิ่ม padding ให้ touch area ใหญ่ขึ้น
        "border-2 border-slate-200/70", // ✅ ใช้ border แทน ring เพื่อ feedback ที่ชัดกว่า
        "shadow-[0_8px_24px_rgba(2,6,23,0.08)]",
        // Interaction - ✅ ปรับ transition ให้นุ่มนวลและเสถียร
        "transition-all duration-300 ease-out",
        // Hover
        "hover:border-[#F59E0B]/40",
        "hover:-translate-y-1",
        "hover:shadow-[0_16px_40px_rgba(245,158,11,0.15)]",
        // Active - ✅ feedback ชัดเจนเมื่อกด
        "active:scale-[0.99]",
        "active:shadow-[0_4px_12px_rgba(2,6,23,0.1)]",
        // Mobile
        "touch-manipulation",
        "cursor-pointer",
        // Focus
        "focus:outline-none",
        "focus-visible:ring-4 focus-visible:ring-[#F59E0B]/40",
        "focus-visible:border-[#F59E0B]",
        // ✅ ป้องกันการ select text เมื่อกดบนมือถือ
        "select-none",
      ].join(" ")}
    >
      {/* Title + Badge Container */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Title */}
        <h3
          className={[
            "min-w-0 flex-1",
            "text-[17px] sm:text-[18px] md:text-[19px]",
            "leading-[1.3]",
            "font-extrabold tracking-[-0.01em]",
            "text-[#1565C0]",
            "transition-colors duration-200",
            "group-hover:text-[#F59E0B]", // ✅ เปลี่ยนสีเมื่อ hover การ์ด
          ].join(" ")}
        >
          <span className="line-clamp-2 break-words">{job.title}</span>
        </h3>

        {/* Badge - ✅ ทำเป็น visual indicator ไม่ใช่ปุ่ม */}
        <div
          className={[
            "shrink-0",
            "inline-flex items-center gap-1.5",
            "rounded-full bg-[#F59E0B]/10",
            "px-3 py-1.5",
            "text-[#F59E0B] font-semibold text-[12px] sm:text-[13px]",
            "border border-[#F59E0B]/20",
            "transition-all duration-200",
            "group-hover:bg-[#F59E0B]",
            "group-hover:text-white",
            "group-hover:border-[#F59E0B]",
            "whitespace-nowrap",
          ].join(" ")}
        >
          <span>{t("common.viewDetail")}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Meta Row - ✅ responsive grid */}
      <div
        className={[
          "grid gap-2.5",
          "grid-cols-1",
          "sm:grid-cols-2",
          "md:grid-cols-3",
        ].join(" ")}
      >
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

      {/* ✅ Visual Indicator - แสดงว่าการ์ดทั้งหมดคลิกได้ */}
      <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-1 text-[#F59E0B] text-xs font-semibold">
          <span className="hidden sm:inline">เปิดดู</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function MetaPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="min-w-0 flex-1 truncate text-[12.5px] sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
        {text}
      </span>
    </div>
  );
}