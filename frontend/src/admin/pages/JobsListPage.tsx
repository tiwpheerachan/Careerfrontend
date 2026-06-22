import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Plus, Pencil, Trash2, Eye, EyeOff, Briefcase } from "lucide-react";
import {
  adminApi,
  JOB_STATUS_LABEL,
  JOB_STATUS_LIST,
  type AdminJob,
} from "../lib/adminApi";
import { PageHeader, Badge, JOB_TONE } from "../ui";

function jobTitle(j: AdminJob): string {
  return j.title_th || j.title_en || j.title_zh || j.job_id;
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("th-TH", { dateStyle: "medium" });
}

export default function JobsListPage() {
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listJobs({ q: q.trim(), status })
      .then((res) => setRows(res.rows))
      .catch((e) => setError(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce ค้นหา
    return () => clearTimeout(t);
  }, [load]);

  const togglePublish = async (j: AdminJob) => {
    const next = j.status === "published" ? "draft" : "published";
    setBusy(j.job_id);
    try {
      await adminApi.setJobStatus(j.job_id, next);
      setRows((rs) => rs.map((r) => (r.job_id === j.job_id ? { ...r, status: next } : r)));
    } catch (e: any) {
      alert(e.message || "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (j: AdminJob) => {
    if (!confirm(`ลบงาน "${jobTitle(j)}" (${j.job_id}) ?\nการลบนี้ย้อนกลับไม่ได้`)) return;
    setBusy(j.job_id);
    try {
      await adminApi.deleteJob(j.job_id);
      setRows((rs) => rs.filter((r) => r.job_id !== j.job_id));
    } catch (e: any) {
      alert(e.message || "ลบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title="ประกาศงาน"
        subtitle={`ทั้งหมด ${rows.length} ตำแหน่ง`}
        actions={
          <Link to="/admin/jobs/new" className="btn-primary shadow-lg shadow-blue-600/20">
            <Plus className="mr-1 h-4 w-4" /> สร้างงานใหม่
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="ค้นหาชื่อตำแหน่ง / job id / แผนก…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus("")}
            className={`chip ${!status ? "!border-blue-600 !bg-blue-50 !text-blue-700" : ""}`}
          >
            ทั้งหมด
          </button>
          {JOB_STATUS_LIST.map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`chip ${status === st ? "!border-blue-600 !bg-blue-50 !text-blue-700" : ""}`}
            >
              {JOB_STATUS_LABEL[st]}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">
            ยังไม่มีประกาศงาน — กด “สร้างงานใหม่” เพื่อเริ่ม
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ตำแหน่ง</th>
                  <th className="px-4 py-3 font-semibold">แผนก / ระดับ</th>
                  <th className="px-4 py-3 font-semibold">รับ</th>
                  <th className="px-4 py-3 font-semibold">ผู้สมัคร</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">แก้ไขล่าสุด</th>
                  <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.job_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/jobs/${encodeURIComponent(j.job_id)}/edit`} className="font-semibold text-blue-700 hover:underline">
                        {jobTitle(j)}
                      </Link>
                      <div className="text-xs text-gray-400">{j.job_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{j.department || "—"}</div>
                      <div className="text-xs text-gray-400">{j.level || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{j.quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      {j.applicant_count ? (
                        <Link
                          to={`/admin/applications?job_id=${encodeURIComponent(j.job_id)}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                        >
                          {j.applicant_count} คน
                        </Link>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={JOB_TONE[j.status] || "gray"}>
                        {JOB_STATUS_LABEL[j.status] || j.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(j.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title={j.status === "published" ? "เปลี่ยนเป็นฉบับร่าง" : "เผยแพร่"}
                          onClick={() => togglePublish(j)}
                          disabled={busy === j.job_id}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                        >
                          {j.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <Link
                          to={`/admin/jobs/${encodeURIComponent(j.job_id)}/edit`}
                          title="แก้ไข"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          title="ลบ"
                          onClick={() => remove(j)}
                          disabled={busy === j.job_id}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
