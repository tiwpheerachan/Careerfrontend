import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Users,
  Briefcase,
  TrendingUp,
  Target,
  LayoutDashboard,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { adminApi, STATUS_LABEL, STATUS_LIST, type AnalyticsResponse } from "../lib/adminApi";
import { PageHeader, Badge, APP_TONE, Panel, BarList, Sparkbars } from "../ui";

function Kpi({
  icon,
  label,
  value,
  tone,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
  to?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>{icon}</div>
      <div className="mt-4 text-3xl font-black">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  const [a, setA] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .analytics()
      .then((d) => alive && setA(d))
      .catch((e) => alive && setError(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const periodTotal = a?.daily.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="ภาพรวม"
        subtitle="วิเคราะห์งานและผู้สมัครเพื่อประเมิน/พัฒนาเว็บ"
        actions={
          <Link to="/admin/applications" className="btn-secondary">
            ผู้สมัครทั้งหมด <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      )}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200/60">{error}</div>}

      {a && (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<Users className="h-5 w-5 text-blue-700" />} tone="bg-blue-50" label="ผู้สมัครทั้งหมด" value={a.totals.applications} to="/admin/applications" />
            <Kpi icon={<Briefcase className="h-5 w-5 text-indigo-700" />} tone="bg-indigo-50" label="งานเปิดรับ" value={a.totals.published} to="/admin/jobs" />
            <Kpi icon={<Target className="h-5 w-5 text-emerald-700" />} tone="bg-emerald-50" label="อัตรารับเข้า (hire rate)" value={`${Math.round(a.totals.hire_rate * 100)}%`} />
            <Kpi icon={<TrendingUp className="h-5 w-5 text-violet-700" />} tone="bg-violet-50" label="เฉลี่ยผู้สมัคร/งานเปิดรับ" value={a.totals.avg_per_published} />
          </div>

          {/* เทรนด์ + สถานะ */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              title="ผู้สมัครย้อนหลัง 30 วัน"
              subtitle={`รวม ${periodTotal} ใบในช่วงนี้`}
              right={<Badge tone="blue">30 วัน</Badge>}
            >
              <Sparkbars data={a.daily} />
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <span>{a.daily[0]?.date.slice(5)}</span>
                <span>วันนี้</span>
              </div>
            </Panel>

            <Panel title="ตามสถานะ" subtitle="กดเพื่อกรองผู้สมัคร">
              <div className="space-y-2">
                {STATUS_LIST.map((st) => {
                  const c = a.by_status[st] ?? 0;
                  return (
                    <Link
                      key={st}
                      to={`/admin/applications?status=${st}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-gray-50"
                    >
                      <Badge tone={APP_TONE[st] || "gray"}>{STATUS_LABEL[st]}</Badge>
                      <span className="text-lg font-black">{c}</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* อันดับงาน + แผนก + ช่องทาง */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="งานยอดนิยม" subtitle="ผู้สมัครมากที่สุด">
              <BarList
                items={a.by_job.slice(0, 8).map((j) => ({
                  label: j.title,
                  value: j.count,
                  sublabel: j.job_id,
                  href: `/admin/applications?job_id=${encodeURIComponent(j.job_id)}`,
                }))}
              />
            </Panel>

            <Panel title="ตามแผนก" subtitle="ผู้สมัครต่อแผนก">
              <BarList items={a.by_department.slice(0, 8).map((d) => ({ label: d.name, value: d.count }))} />
            </Panel>

            <Panel title="ช่องทางที่รู้จัก" subtitle="source channel">
              <BarList items={a.by_source.slice(0, 8).map((d) => ({ label: d.name, value: d.count }))} />
            </Panel>
          </div>

          {/* งานที่ยังไม่มีผู้สมัคร — ให้แอดมินปรับปรุง */}
          {a.zero_jobs.length > 0 && (
            <Panel
              title="งานที่เปิดรับแต่ยังไม่มีผู้สมัคร"
              subtitle="ลองปรับชื่อ/รายละเอียด หรือโปรโมตเพิ่ม"
              right={<Badge tone="amber"><AlertTriangle className="mr-1 h-3 w-3" />{a.zero_jobs.length}</Badge>}
            >
              <div className="flex flex-wrap gap-2">
                {a.zero_jobs.map((j) => (
                  <Link
                    key={j.job_id}
                    to={`/admin/jobs/${encodeURIComponent(j.job_id)}/edit`}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    {j.title} <span className="text-xs text-gray-400">· {j.job_id}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
