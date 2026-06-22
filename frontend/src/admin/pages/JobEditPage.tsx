import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  Briefcase,
  Hash,
  Building2,
  Layers3,
  Globe2,
  Users,
  Type,
  MapPin,
  AlignLeft,
  BadgeCheck,
} from "lucide-react";
import {
  adminApi,
  JOB_STATUS_LABEL,
  JOB_STATUS_LIST,
  type AdminJob,
  type JobOptions,
} from "../lib/adminApi";
import { PageHeader } from "../ui";

const LANGS = [
  { key: "th", label: "ไทย" },
  { key: "en", label: "EN" },
  { key: "zh", label: "中文" },
] as const;

const STATUS_STYLE: Record<string, { on: string; dot: string }> = {
  draft: { on: "border-amber-300 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  published: { on: "border-emerald-300 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  closed: { on: "border-gray-300 bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

const EMPTY: AdminJob = {
  job_id: "",
  status: "draft",
  country: "Thailand",
  department: "",
  level: "",
  quantity: 1,
  title_th: "", title_en: "", title_zh: "",
  location_th: "", location_en: "", location_zh: "",
  desc_th: "", desc_en: "", desc_zh: "",
  qual_th: "", qual_en: "", qual_zh: "",
};

function Labeled({ icon, label, hint, children }: { icon?: React.ReactNode; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
        {hint && <span className="text-xs font-normal text-gray-400">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function JobEditPage() {
  const { jobId } = useParams();
  const isEdit = !!jobId;
  const navigate = useNavigate();

  const [form, setForm] = useState<AdminJob>(EMPTY);
  const [opts, setOpts] = useState<JobOptions | null>(null);
  const [lang, setLang] = useState<(typeof LANGS)[number]["key"]>("th");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.jobOptions().then(setOpts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    adminApi
      .getJob(jobId!)
      .then((res) => setForm({ ...EMPTY, ...res.job }))
      .catch((e) => setError(e.message || "โหลดงานไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [jobId, isEdit]);

  const set = (patch: Partial<AdminJob>) => setForm((f) => ({ ...f, ...patch }));
  const setLangField = (base: string, value: string) => set({ [`${base}_${lang}`]: value } as any);
  const lf = (base: string): string => (form as any)[`${base}_${lang}`] || "";
  const langFilled = (l: string): boolean => !!(form as any)[`title_${l}`];

  const onSave = async () => {
    setError(null);
    if (!form.job_id.trim()) return setError("กรุณากรอก Job ID");
    if (!form.title_th && !form.title_en && !form.title_zh) return setError("กรุณากรอกชื่อตำแหน่งอย่างน้อย 1 ภาษา");
    setSaving(true);
    try {
      const payload: AdminJob = {
        ...form,
        quantity:
          form.quantity === null || form.quantity === undefined || (form.quantity as any) === ""
            ? null
            : Number(form.quantity),
      };
      if (isEdit) await adminApi.updateJob(jobId!, payload);
      else await adminApi.createJob(payload);
      setSaved(true);
      setTimeout(() => navigate("/admin/jobs"), 600);
    } catch (e: any) {
      setError(e.message || "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`ลบงาน ${form.job_id} ? ย้อนกลับไม่ได้`)) return;
    setSaving(true);
    try {
      await adminApi.deleteJob(jobId!);
      navigate("/admin/jobs");
    } catch (e: any) {
      setError(e.message || "ลบไม่สำเร็จ");
      setSaving(false);
    }
  };

  const datalists = useMemo(
    () => (
      <>
        <datalist id="dl-dept">{opts?.departments.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="dl-level">{opts?.levels.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="dl-country">{opts?.countries.map((d) => <option key={d} value={d} />)}</datalist>
      </>
    ),
    [opts]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
      </div>
    );
  }

  const SaveBtn = (
    <button onClick={onSave} disabled={saving} className="btn-primary w-full shadow-lg shadow-blue-600/20 disabled:opacity-50">
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <><CheckCircle2 className="mr-1 h-4 w-4" /> บันทึกแล้ว</>
      ) : (
        <><Save className="mr-1 h-4 w-4" /> {isEdit ? "บันทึกการแก้ไข" : "สร้างงาน"}</>
      )}
    </button>
  );

  return (
    <div>
      {datalists}
      <Link to="/admin/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> กลับไปรายการงาน
      </Link>

      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title={isEdit ? "แก้ไขงาน" : "สร้างงานใหม่"}
        subtitle={isEdit ? form.job_id : "กรอกรายละเอียดงานทั้ง 3 ภาษา"}
        actions={
          isEdit && (
            <button onClick={onDelete} disabled={saving} className="btn-secondary !text-red-600 hover:!bg-red-50">
              <Trash2 className="mr-1 h-4 w-4" /> ลบงาน
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===== คอลัมน์เนื้อหา ===== */}
        <div className="min-w-0 space-y-6">
          {/* ข้อมูลทั่วไป */}
          <div className="card p-6">
            <h2 className="mb-5 text-sm font-bold text-gray-900">ข้อมูลทั่วไป</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Labeled icon={<Hash className="h-4 w-4" />} label="Job ID" hint="รหัสงาน ห้ามซ้ำ">
                <input
                  className="input font-mono disabled:bg-gray-100"
                  value={form.job_id}
                  disabled={isEdit}
                  placeholder="SHD-TH-HRBP"
                  onChange={(e) => set({ job_id: e.target.value.trim() })}
                />
              </Labeled>
              <Labeled icon={<Users className="h-4 w-4" />} label="จำนวนที่รับ">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.quantity ?? ""}
                  onChange={(e) => set({ quantity: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Labeled>
              <Labeled icon={<Building2 className="h-4 w-4" />} label="แผนก">
                <input className="input" list="dl-dept" value={form.department || ""} onChange={(e) => set({ department: e.target.value })} placeholder="เช่น Marketing, Offline" />
              </Labeled>
              <Labeled icon={<Layers3 className="h-4 w-4" />} label="ระดับ">
                <input className="input" list="dl-level" value={form.level || ""} onChange={(e) => set({ level: e.target.value })} placeholder="เช่น Officer, Senior" />
              </Labeled>
              <Labeled icon={<Globe2 className="h-4 w-4" />} label="ประเทศ">
                <input className="input" list="dl-country" value={form.country || ""} onChange={(e) => set({ country: e.target.value })} placeholder="Thailand" />
              </Labeled>
            </div>
          </div>

          {/* เนื้อหา 3 ภาษา */}
          <div className="card p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-900">เนื้อหาประกาศ</h2>
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setLang(l.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      lang === l.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${langFilled(l.key) ? "bg-emerald-500" : "bg-gray-300"}`} />
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <Labeled icon={<Type className="h-4 w-4" />} label={`ชื่อตำแหน่ง (${lang.toUpperCase()})`}>
                <input className="input" value={lf("title")} onChange={(e) => setLangField("title", e.target.value)} placeholder="เช่น HR Business Partner" />
              </Labeled>
              <Labeled icon={<MapPin className="h-4 w-4" />} label={`สถานที่ (${lang.toUpperCase()})`}>
                <input className="input" value={lf("location")} onChange={(e) => setLangField("location", e.target.value)} placeholder="เช่น ไทย - กรุงเทพฯ" />
              </Labeled>
              <Labeled icon={<AlignLeft className="h-4 w-4" />} label={`รายละเอียดงาน (${lang.toUpperCase()})`}>
                <textarea className="input min-h-[160px] resize-y leading-relaxed" value={lf("desc")} onChange={(e) => setLangField("desc", e.target.value)} />
              </Labeled>
              <Labeled icon={<BadgeCheck className="h-4 w-4" />} label={`คุณสมบัติ (${lang.toUpperCase()})`}>
                <textarea className="input min-h-[130px] resize-y leading-relaxed" value={lf("qual")} onChange={(e) => setLangField("qual", e.target.value)} />
              </Labeled>
            </div>

            <p className="muted mt-4 text-xs">💡 ถ้าภาษาใดเว้นว่าง เว็บจะ fallback ไปใช้ EN → TH → ZH ให้อัตโนมัติ</p>
          </div>
        </div>

        {/* ===== แผงเผยแพร่ (sticky) ===== */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-6">
            <h2 className="mb-3 text-sm font-bold text-gray-900">การเผยแพร่</h2>

            <div className="space-y-2">
              {JOB_STATUS_LIST.map((s) => {
                const active = form.status === s;
                const st = STATUS_STYLE[s];
                return (
                  <button
                    key={s}
                    onClick={() => set({ status: s })}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      active ? st.on : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${active ? st.dot : "bg-gray-300"}`} />
                    {JOB_STATUS_LABEL[s]}
                    {active && <CheckCircle2 className="ml-auto h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
              {form.status === "published"
                ? "✅ งานนี้จะแสดงบนเว็บไซต์สาธารณะ"
                : form.status === "draft"
                ? "📝 ฉบับร่าง — ยังไม่แสดงบนเว็บ"
                : "🔒 ปิดรับ — ไม่แสดงบนเว็บ"}
            </div>

            {error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-200/60">{error}</div>}

            <div className="mt-5 space-y-2">
              {SaveBtn}
              <Link to="/admin/jobs" className="btn-secondary w-full">ยกเลิก</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
