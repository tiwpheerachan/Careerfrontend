import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  FileText,
  Download,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  CheckCircle2,
} from "lucide-react";
import {
  adminApi,
  STATUS_LABEL,
  STATUS_LIST,
  type AdminApplicationDetail,
} from "../lib/adminApi";
import { Badge, APP_TONE } from "../ui";

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<AdminApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("new");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    adminApi
      .getApplication(id)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus(d.application.status || "new");
        setNote(d.application.admin_note || "");
      })
      .catch((e) => alive && setError(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await adminApi.updateApplication(id, { status, admin_note: note });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
      </div>
    );
  }
  if (error && !data) {
    return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>;
  }
  if (!data) return null;

  const a = data.application;

  return (
    <div>
      <Link to="/admin/applications" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> กลับไปรายชื่อผู้สมัคร
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight">
              {a.first_name} {a.last_name}
            </h1>
            <Badge tone={APP_TONE[a.status || "new"] || "gray"}>
              {STATUS_LABEL[a.status || "new"] || a.status}
            </Badge>
          </div>
          <p className="muted">
            สมัครตำแหน่ง <span className="font-semibold text-gray-700">{a.job_id}</span> · เมื่อ {fmtDate(a.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="space-y-5 lg:col-span-2">
          <Section title="ข้อมูลติดต่อ">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="อีเมล" value={<a className="inline-flex items-center gap-1 text-blue-700 hover:underline" href={`mailto:${a.email}`}><Mail className="h-3.5 w-3.5" />{a.email}</a>} />
              <Field label="เบอร์โทร" value={<span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-400" />{a.phone}</span>} />
              <Field label="ที่อยู่" value={a.address ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" />{a.address}</span> : undefined} />
              <Field label="เว็บไซต์ / พอร์ต" value={a.website_url ? <a className="inline-flex items-center gap-1 text-blue-700 hover:underline" href={a.website_url} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5" />ลิงก์</a> : undefined} />
            </div>
          </Section>

          <Section title="รายละเอียดตำแหน่ง">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="ประเทศ" value={a.country} />
              <Field label="แผนก" value={a.department} />
              <Field label="ระดับ" value={a.level} />
              <Field label="ต้องการวีซ่า" value={a.visa_required ? "ใช่" : "ไม่"} />
              <Field label="เริ่มงานได้" value={a.available_start_date || undefined} />
              <Field label="ช่องทางที่รู้จัก" value={a.source_channel} />
            </div>
          </Section>

          {data.skills.length > 0 && (
            <Section title="ทักษะ">
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s, i) => (
                  <span key={i} className="chip">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {data.educations.length > 0 && (
            <Section title="การศึกษา">
              <div className="space-y-3">
                {data.educations.map((e, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-3 text-sm">
                    <div className="font-semibold">{e.institute || "—"}</div>
                    <div className="text-gray-600">
                      {[e.degree_level, e.program].filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-xs text-gray-400">
                      {[e.start_month, e.end_month].filter(Boolean).join(" – ")}
                      {e.gpa ? ` · GPA ${e.gpa}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {data.experiences.length > 0 && (
            <Section title="ประสบการณ์ทำงาน">
              <div className="space-y-3">
                {data.experiences.map((x, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-3 text-sm">
                    <div className="font-semibold">{x.role || "—"}</div>
                    <div className="text-gray-600">{x.company}</div>
                    <div className="text-xs text-gray-400">
                      {[x.start_month, x.end_month].filter(Boolean).join(" – ")}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right: actions + files */}
        <div className="space-y-5">
          <Section title="จัดการสถานะ">
            <label className="label mb-1 block">สถานะ</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <label className="label mb-1 mt-4 block">โน้ตภายใน</label>
            <textarea
              className="input min-h-[90px] resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บันทึกความเห็น / ผลสัมภาษณ์…"
            />

            {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <button onClick={onSave} disabled={saving} className="btn-primary mt-4 w-full disabled:opacity-50">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <><CheckCircle2 className="mr-1 h-4 w-4" /> บันทึกแล้ว</>
              ) : (
                <><Save className="mr-1 h-4 w-4" /> บันทึก</>
              )}
            </button>
            {a.reviewed_at && (
              <p className="muted mt-2 text-center text-xs">อัปเดตล่าสุด {fmtDate(a.reviewed_at)}</p>
            )}
          </Section>

          <Section title="เอกสาร">
            <div className="space-y-2">
              {a.resume_download_url ? (
                <a href={a.resume_download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="flex-1">Resume / CV</span>
                  <Download className="h-4 w-4 text-gray-400" />
                </a>
              ) : (
                <div className="text-sm text-gray-400">ไม่มี resume</div>
              )}

              {a.transcript_download_url && (
                <a href={a.transcript_download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="flex-1">Transcript</span>
                  <Download className="h-4 w-4 text-gray-400" />
                </a>
              )}

              {data.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.download_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="flex-1 truncate">{att.file_name || `ไฟล์แนบ ${i + 1}`}</span>
                  <Download className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
