import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Search, ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import {
  adminApi,
  STATUS_LABEL,
  STATUS_LIST,
  type AdminApplication,
  type AdminJob,
} from "../lib/adminApi";
import { PageHeader, Badge, APP_TONE } from "../ui";

function jobLabel(j: AdminJob): string {
  return j.title_th || j.title_en || j.title_zh || j.job_id;
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

const PAGE_SIZE = 20;

export default function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const q = searchParams.get("q") || "";
  const jobId = searchParams.get("job_id") || "";

  const [rows, setRows] = useState<AdminApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  useEffect(() => {
    adminApi.listJobs().then((r) => setJobs(r.rows)).catch(() => {});
  }, []);
  const selectedJob = jobs.find((j) => j.job_id === jobId);
  const jobTitleById = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.job_id, jobLabel(j)])),
    [jobs]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    adminApi
      .listApplications({ q, status, job_id: jobId, page, page_size: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => alive && setError(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, status, jobId, page]);

  const updateParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    });
    // เปลี่ยน filter ใดๆ ให้กลับหน้า 1
    if (!("page" in patch)) next.delete("page");
    setSearchParams(next);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam({ q: searchInput.trim() || null });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [exporting, setExporting] = useState(false);
  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportApplications({ q, status });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="ผู้สมัคร"
        subtitle={`ทั้งหมด ${total} รายการ`}
        actions={
          <button onClick={onExport} disabled={exporting || total === 0} className="btn-secondary disabled:opacity-50">
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="ค้นหาชื่อ / อีเมล / เบอร์โทร…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        {/* กรองตามตำแหน่งงาน */}
        <select
          className="input sm:w-72"
          value={jobId}
          onChange={(e) => updateParam({ job_id: e.target.value || null })}
        >
          <option value="">ทุกตำแหน่งงาน</option>
          {jobs.map((j) => (
            <option key={j.job_id} value={j.job_id}>
              {jobLabel(j)}
              {j.applicant_count != null ? ` (${j.applicant_count})` : ""}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParam({ status: null })}
            className={`chip ${!status ? "!border-blue-600 !bg-blue-50 !text-blue-700" : ""}`}
          >
            ทั้งหมด
          </button>
          {STATUS_LIST.map((st) => (
            <button
              key={st}
              onClick={() => updateParam({ status: st })}
              className={`chip ${status === st ? "!border-blue-600 !bg-blue-50 !text-blue-700" : ""}`}
            >
              {STATUS_LABEL[st]}
            </button>
          ))}
        </div>
      </div>

      {/* แถบบริบทเมื่อกรองตามตำแหน่ง */}
      {jobId && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-sm ring-1 ring-inset ring-blue-200/60">
          <span className="text-blue-800">
            กำลังดูผู้สมัครตำแหน่ง <span className="font-bold">{selectedJob ? jobLabel(selectedJob) : jobId}</span>
          </span>
          <button onClick={() => updateParam({ job_id: null })} className="font-semibold text-blue-700 hover:underline">
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">ไม่พบผู้สมัคร</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ชื่อ</th>
                  <th className="px-4 py-3 font-semibold">ตำแหน่ง / แผนก</th>
                  <th className="px-4 py-3 font-semibold">ติดต่อ</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">สมัครเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/applications/${r.id}`} className="font-semibold text-blue-700 hover:underline">
                        {r.first_name} {r.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium text-gray-800">{jobTitleById[r.job_id] || r.job_id}</div>
                      <div className="text-xs text-gray-400">
                        {r.job_id}
                        {[r.department, r.level].filter(Boolean).length
                          ? " · " + [r.department, r.level].filter(Boolean).join(" • ")
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{r.email}</div>
                      <div className="text-xs text-gray-400">{r.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={APP_TONE[r.status || "new"] || "gray"}>
                        {STATUS_LABEL[r.status || "new"] || r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <div className="muted">
            หน้า {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParam({ page: String(page - 1) })}
              className="btn-secondary disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => updateParam({ page: String(page + 1) })}
              className="btn-secondary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
