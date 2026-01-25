import { Link } from "react-router-dom";
import { MapPin, Building2, Layers3 } from "lucide-react";
import type { Job } from "@/lib/types";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: Job }) {
  const { t } = useTranslation();

  return (
    <div className="card p-6 transition hover:border-slate-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <Link
            to={`/jobs/${encodeURIComponent(job.job_id)}`}
            className="block min-w-0 text-base font-black text-slate-900 hover:text-blue-700"
          >
            <span className="line-clamp-2 break-words">{job.title}</span>
          </Link>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge">
              <Building2 className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">{job.department}</span>
            </span>

            <span className="badge">
              <Layers3 className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">{job.level}</span>
            </span>

            <span className="badge">
              <MapPin className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">{job.location}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end sm:justify-start">
          <Link
            to={`/jobs/${encodeURIComponent(job.job_id)}`}
            className="btn btn-ghost whitespace-nowrap"
          >
            {t("common.viewDetail")}
          </Link>
        </div>
      </div>
    </div>
  );
}
