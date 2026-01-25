import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Briefcase, MapPin, Building2, Layers3 } from "lucide-react";
import { getJob } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <div className="mt-6">
      <div className="text-sm font-black">{title}</div>
      <div className="mt-2 whitespace-pre-line text-sm text-slate-700">{body}</div>
    </div>
  );
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    setLoading(true);

    getJob(jobId, lang)
      .then((j) => {
        if (!alive) return;
        setJob(j);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [jobId, lang]);

  return (
    <>
      <Helmet>
        <title>{job ? `${job.title} • SHD Careers` : `Job • SHD Careers`}</title>
      </Helmet>

      <section className="container-page py-10">
        <Link to="/jobs" className="btn btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        {loading ? (
          <div className="mt-4 text-sm text-slate-600">{t("common.loading")}</div>
        ) : !job ? (
          <div className="mt-4 card p-6 text-sm text-slate-600">{t("common.notFound")}</div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="card p-8">
              <h1 className="text-2xl font-black tracking-tight">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge"><Building2 className="h-3.5 w-3.5" /> {job.department}</span>
                <span className="badge"><Layers3 className="h-3.5 w-3.5" /> {job.level}</span>
                <span className="badge"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
              </div>

              <Section title="Description" body={job.description} />
              <Section title="Qualifications" body={job.qualifications} />
              <Section title="Responsibilities" body={job.responsibilities ?? ""} />
              <Section title="Benefits" body={job.benefits ?? ""} />
            </div>

            <div className="space-y-4">
              <div className="card p-6">
                <div className="text-sm font-black">{t("common.applyNow")}</div>
                <div className="mt-2 text-sm text-slate-600">
                  Apply with your basic information and attachments. The admin will receive your application automatically.
                </div>
                <div className="mt-4">
                  <Link to={`/jobs/${encodeURIComponent(job.job_id)}/apply`} className="btn btn-primary w-full">
                    <Briefcase className="h-4 w-4" />
                    {t("common.applyNow")}
                  </Link>
                </div>
              </div>

              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500">Job ID</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.job_id}</div>
                <div className="mt-4 text-xs font-semibold text-slate-500">Country</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.country}</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
