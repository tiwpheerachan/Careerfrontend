import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Loader2,
  ShieldCheck,
  FileText,
  Sparkles,
  Calendar,
  Trash2,
  Paperclip,
} from "lucide-react";
import { getJob, submitApplication } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

type Edu = { level: string; school: string; from: string; to: string; note?: string };
type Exp = { company: string; title: string; from: string; to: string; note?: string };

/** -------------------- utils -------------------- */
function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
function normalizePhoneNumber(s: string) {
  return (s || "").replace(/[^\d]/g, "");
}
function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}
function fileKey(f: File) {
  return `${f.name}__${f.size}__${f.lastModified}`;
}
function clampFiles(input: FileList | null, maxBytes: number) {
  if (!input) return null;
  const files = Array.from(input);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > maxBytes) {
    return { ok: false as const, message: `Total file size exceeds ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }
  return { ok: true as const, files };
}

/** -------------------- constants -------------------- */
const RESIDENCE_COUNTRIES: Array<{ value: string; label: string }> = [
  { value: "Thailand", label: "ไทย (Thailand)" },
  { value: "China", label: "จีน (China)" },
  { value: "Indonesia", label: "อินโดนีเซีย (Indonesia)" },
  { value: "Philippines", label: "ฟิลิปปินส์ (Philippines)" },
  { value: "Vietnam", label: "เวียดนาม (Vietnam)" },
  { value: "Brazil", label: "บราซิล (Brazil)" },
  { value: "Mexico", label: "เม็กซิโก (Mexico)" },
  { value: "Saudi Arabia", label: "ซาอุดีอาระเบีย (Saudi Arabia)" },
  { value: "United Arab Emirates (Dubai)", label: "ดูไบ (Dubai, UAE)" },
  { value: "Other", label: "อื่น ๆ (Other)" },
];

const PHONE_COUNTRY_CODES = [
  { code: "+66", label: "Thailand (+66)" },
  { code: "+86", label: "China (+86)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+971", label: "UAE (+971)" },
] as const;

const EDUCATION_LEVELS = [
  { value: "Secondary School / High School", label: "Secondary School / High School — มัธยมศึกษาตอนปลาย / High School" },
  { value: "Vocational Certificate (Voc. Cert.)", label: "Vocational Certificate (Voc. Cert.) — ปวช." },
  { value: "Higher Vocational Certificate (High Voc. Cert.)", label: "Higher Vocational Certificate (High Voc. Cert.) — ปวส." },
  { value: "Diploma / Associate Degree", label: "Diploma / Associate Degree — อนุปริญญา / Diploma / Associate" },
  { value: "Bachelor’s Degree", label: "Bachelor’s Degree — ปริญญาตรี" },
  { value: "Master’s Degree", label: "Master’s Degree — ปริญญาโท" },
  { value: "Doctoral Degree (PhD / DBA / EdD)", label: "Doctoral Degree (PhD / DBA / EdD) — ปริญญาเอก" },
  { value: "Currently Studying", label: "Currently Studying — กำลังศึกษาอยู่" },
  { value: "Incomplete / Did Not Graduate", label: "Incomplete / Did Not Graduate — ศึกษาแต่ยังไม่สำเร็จการศึกษา" },
  { value: "Other / Equivalent", label: "Other / Equivalent — อื่น ๆ (เทียบเท่า)" },
] as const;

const SKILL_CATEGORIES: Record<string, { title: string; items: string[] }> = {
  "Office & Productivity": {
    title: "Office & Productivity",
    items: ["Excel", "Google Sheets", "PowerPoint", "Word", "Data Entry", "Documentation", "Reporting", "Presentation", "Email Communication", "Calendar & Scheduling"],
  },
  "Customer & Operations": {
    title: "Customer & Operations",
    items: ["Customer Service", "Sales Support", "Operations", "Process Improvement", "Logistics", "Inventory Management", "Order Management", "Vendor Management", "Quality Assurance", "Problem Solving"],
  },
  "Data & Analytics": {
    title: "Data & Analytics",
    items: ["Data Analytics", "SQL", "Python", "Power BI", "Tableau", "Google Looker Studio", "A/B Testing", "Forecasting", "Dashboarding", "KPI Tracking"],
  },
  Engineering: {
    title: "Engineering",
    items: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "REST APIs", "Git", "Testing", "CI/CD", "System Design"],
  },
  "Business & Leadership": {
    title: "Business & Leadership",
    items: ["Project Management", "Stakeholder Management", "Communication", "Leadership", "Teamwork", "Time Management", "Negotiation", "Public Speaking", "Business Analysis", "Strategy"],
  },
  "E-commerce & Marketing": {
    title: "E-commerce & Marketing",
    items: ["E-commerce", "Shopee", "Lazada", "TikTok Shop", "Product Listing", "Ads Optimization", "SEO", "Content Writing", "Social Media", "Campaign Planning"],
  },
};

const MONTHS = [
  { v: "01", label: "Jan" },
  { v: "02", label: "Feb" },
  { v: "03", label: "Mar" },
  { v: "04", label: "Apr" },
  { v: "05", label: "May" },
  { v: "06", label: "Jun" },
  { v: "07", label: "Jul" },
  { v: "08", label: "Aug" },
  { v: "09", label: "Sep" },
  { v: "10", label: "Oct" },
  { v: "11", label: "Nov" },
  { v: "12", label: "Dec" },
];

/** -------------------- UI atoms -------------------- */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <label className="text-xs font-semibold text-slate-600">
          {label} {required ? <span className="text-rose-600">*</span> : null}
        </label>
        {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Modal({
  open,
  title,
  desc,
  children,
}: {
  open: boolean;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/85 shadow-2xl backdrop-blur-xl">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">{title}</div>
              {desc ? <div className="mt-1 text-sm text-slate-600">{desc}</div> : null}
            </div>
          </div>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function StepPill({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : active
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", done ? "bg-emerald-500" : active ? "bg-blue-500" : "bg-slate-300"].join(" ")} />
      {label}
    </div>
  );
}

/** -------------------- Month-Year Picker -------------------- */
function ymToLabel(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const mm = MONTHS.find((x) => x.v === m)?.label ?? m;
  return `${mm} ${y}`;
}
function buildYM(year: number, monthV: string) {
  return `${year}-${monthV}`;
}
function todayYM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function parseYM(ym: string) {
  if (!ym) return null;
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) return null;
  return { y, m };
}

function MonthYearPicker({
  value,
  onChange,
  placeholder = "Select month…",
  minYM,
  maxYM,
}: {
  value: string;
  onChange: (ym: string) => void;
  placeholder?: string;
  minYM?: string;
  maxYM?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const now = new Date();
  const defaultYear = parseYM(value)?.y ?? now.getFullYear();
  const defaultMonth = parseYM(value)?.m ?? now.getMonth() + 1;

  const [year, setYear] = useState<number>(defaultYear);
  const [monthV, setMonthV] = useState<string>(String(defaultMonth).padStart(2, "0"));

  useEffect(() => {
    const p = parseYM(value);
    if (!p) return;
    setYear(p.y);
    setMonthV(String(p.m).padStart(2, "0"));
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as any)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const years = useMemo(() => {
    const nowY = new Date().getFullYear();
    const minY = parseYM(minYM || "")?.y ?? nowY - 35;
    const maxY = parseYM(maxYM || "")?.y ?? nowY + 5;
    const a: number[] = [];
    for (let y = maxY; y >= minY; y--) a.push(y);
    return a;
  }, [minYM, maxYM]);

  function apply() {
    const ym = buildYM(year, monthV);

    if (minYM && ym < minYM) {
      onChange(minYM);
      setOpen(false);
      return;
    }
    if (maxYM && ym > maxYM) {
      onChange(maxYM);
      setOpen(false);
      return;
    }
    onChange(ym);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn("input flex w-full items-center justify-between gap-2", "bg-white/85 text-left")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn("truncate", value ? "text-slate-900" : "text-slate-500")}>
          {value ? ymToLabel(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-[120] mt-2 w-full min-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Year</div>
                <select className="input h-10" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Month</div>
                <select className="input h-10" value={monthV} onChange={(e) => setMonthV(e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const ym = todayYM();
                    onChange(ym);
                    setOpen(false);
                  }}
                >
                  This month
                </button>
                <button type="button" className="btn btn-primary" onClick={apply}>
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="px-3 py-2 text-[11px] text-slate-500">Tip: เลือก “ปี” และ “เดือน” ได้ตรง ๆ (ไม่ใช้ปฏิทินรายวัน)</div>
        </div>
      )}
    </div>
  );
}

function MonthRange({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: {
  from: string;
  to: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}) {
  useEffect(() => {
    if (from && to && to < from) onChangeTo(from);
  }, [from, to, onChangeTo]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="From">
        <MonthYearPicker value={from} onChange={onChangeFrom} placeholder="Select start…" />
      </Field>
      <Field label="To">
        <MonthYearPicker value={to} onChange={onChangeTo} placeholder="Select end…" minYM={from || undefined} />
      </Field>
    </div>
  );
}

/** -------------------- page -------------------- */
export default function ApplyPage() {
  const { jobId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [phoneCode, setPhoneCode] = useState<(typeof PHONE_COUNTRY_CODES)[number]["code"]>("+66");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [residenceCountry, setResidenceCountry] = useState<string>("Thailand");
  const [residenceCountryOther, setResidenceCountryOther] = useState<string>("");
  const [addressDetail, setAddressDetail] = useState("");

  const [education, setEducation] = useState<Edu[]>([{ level: "", school: "", from: "", to: "" }]);
  const [experience, setExperience] = useState<Exp[]>([{ company: "", title: "", from: "", to: "" }]);

  const [skills, setSkills] = useState<string[]>([]);
  const [skillTab, setSkillTab] = useState<string>(Object.keys(SKILL_CATEGORIES)[0] || "Office & Productivity");
  const [skillQuery, setSkillQuery] = useState("");
  const [customSkill, setCustomSkill] = useState("");

  const [visa, setVisa] = useState("No");
  const [availableStartDate, setAvailableStartDate] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [source, setSource] = useState("");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "validating" | "uploading" | "sending" | "done">("idle");
  const [submitHint, setSubmitHint] = useState<string>("");

  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    setLoading(true);

    getJob(jobId, lang)
      .then((j) => alive && setJob(j))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [jobId, lang]);

  const fullPhone = useMemo(() => {
    const n = normalizePhoneNumber(phoneNumber);
    return n ? `${phoneCode} ${n}` : `${phoneCode}`.trim();
  }, [phoneCode, phoneNumber]);

  const countryLabel = useMemo(() => {
    if (residenceCountry === "Other") return residenceCountryOther.trim() || "Other";
    const found = RESIDENCE_COUNTRIES.find((c) => c.value === residenceCountry);
    return found?.label ?? residenceCountry;
  }, [residenceCountry, residenceCountryOther]);

  const addressCombined = useMemo(() => {
    const detail = (addressDetail || "").trim();
    return detail ? `${countryLabel} — ${detail}` : countryLabel;
  }, [countryLabel, addressDetail]);

  const disabled = useMemo(() => {
    if (submitting) return true;
    if (!job) return true;

    const requiredOk =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      normalizePhoneNumber(phoneNumber).trim() &&
      (residenceCountry !== "Other" ? residenceCountry : residenceCountryOther.trim()) &&
      source.trim() &&
      agree &&
      resumeFile;

    return !requiredOk;
  }, [submitting, job, firstName, lastName, email, phoneNumber, residenceCountry, residenceCountryOther, source, agree, resumeFile]);

  function toggleSkill(s: string) {
    const clean = (s || "").trim();
    if (!clean) return;
    setSkills((prev) => {
      const has = prev.includes(clean);
      if (has) return prev.filter((x) => x !== clean);
      if (prev.length >= 8) return prev;
      return uniq([...prev, clean]).slice(0, 8);
    });
  }
  function removeSkill(s: string) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  const skillSuggestions = useMemo(() => {
    const q = (skillQuery || "").trim().toLowerCase();
    const tabItems = SKILL_CATEGORIES[skillTab]?.items ?? [];
    const filteredTab = !q ? tabItems : tabItems.filter((x) => x.toLowerCase().includes(q));
    const allItems = Object.values(SKILL_CATEGORIES).flatMap((c) => c.items);
    const globalHits = !q ? [] : allItems.filter((x) => x.toLowerCase().includes(q)).slice(0, 12);
    return uniq([...filteredTab, ...globalHits]).slice(0, 36);
  }, [skillTab, skillQuery]);

  function addCustomSkill() {
    const clean = (customSkill || "").trim();
    if (!clean) return;
    if (skills.includes(clean)) {
      setCustomSkill("");
      return;
    }
    if (skills.length >= 8) return;
    setSkills((prev) => uniq([...prev, clean]).slice(0, 8));
    setCustomSkill("");
  }

  /** -------------------- files: add/remove -------------------- */
  function setResumeFromInput(file: File | null) {
    if (!file) {
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setResult({ ok: false, message: "Resume file must be ≤ 2MB" });
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      return;
    }
    setResumeFile(file);
  }

  function addAttachmentsFromInput(fileList: FileList | null) {
    const r = clampFiles(fileList, 50 * 1024 * 1024);
    if (!r) return;
    if (!r.ok) {
      setResult({ ok: false, message: r.message });
      if (attachmentsInputRef.current) attachmentsInputRef.current.value = "";
      return;
    }

    setAttachments((prev) => {
      const map = new Map<string, File>();
      prev.forEach((f) => map.set(fileKey(f), f));
      r.files.forEach((f) => map.set(fileKey(f), f));
      return Array.from(map.values()).slice(0, 20);
    });

    if (attachmentsInputRef.current) attachmentsInputRef.current.value = "";
  }

  function removeAttachmentByKey(k: string) {
    setAttachments((prev) => prev.filter((f) => fileKey(f) !== k));
  }

  /** -------------------- submit -------------------- */
  async function onSubmit() {
    if (!job) return;
    setResult(null);
    setSubmitting(true);

    setModalOpen(true);
    setSubmitPhase("validating");
    setSubmitHint("Checking required fields…");

    try {
      await new Promise((r) => setTimeout(r, 200));

      setSubmitPhase("uploading");
      setSubmitHint("Preparing your files…");
      await new Promise((r) => setTimeout(r, 200));

      const fd = new FormData();
      fd.set("first_name", firstName.trim());
      fd.set("last_name", lastName.trim());
      fd.set("email", email.trim());
      fd.set("phone", fullPhone);
      fd.set("address", addressCombined);

      fd.set("visa_required", visa);
      fd.set("available_start_date", availableStartDate);
      fd.set("website_url", websiteUrl);
      fd.set("source_channel", source);
      fd.set("terms_accepted", agree ? "true" : "false");

      fd.set("skills", JSON.stringify(skills));
      fd.set("education_json", JSON.stringify(education.filter((e) => e.level || e.school || e.from || e.to)));
      fd.set("experience_json", JSON.stringify(experience.filter((e) => e.company || e.title || e.from || e.to)));

      if (resumeFile) fd.append("resume", resumeFile);
      attachments.forEach((f) => fd.append("attachments", f));

      setSubmitPhase("sending");
      setSubmitHint("Submitting application… Please don’t close this page.");

      const r = await submitApplication(job.job_id, fd);
      setResult(r);

      setSubmitPhase("done");
      setSubmitHint(r.ok ? "Submitted successfully." : (r.message || "Submit failed."));
      await new Promise((rr) => setTimeout(rr, 450));

      if (r.ok) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhoneCode("+66");
        setPhoneNumber("");
        setResidenceCountry("Thailand");
        setResidenceCountryOther("");
        setAddressDetail("");

        setEducation([{ level: "", school: "", from: "", to: "" }]);
        setExperience([{ company: "", title: "", from: "", to: "" }]);
        setSkills([]);
        setSkillQuery("");
        setCustomSkill("");

        setVisa("No");
        setAvailableStartDate("");
        setWebsiteUrl("");
        setSource("");

        setResumeFile(null);
        setAttachments([]);
        setAgree(false);

        if (resumeInputRef.current) resumeInputRef.current.value = "";
        if (attachmentsInputRef.current) attachmentsInputRef.current.value = "";

        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? "Error" });
      setSubmitPhase("done");
      setSubmitHint(e?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const skillTabTitle = SKILL_CATEGORIES[skillTab]?.title ?? "Skills";

  return (
    <>
      <Helmet>
        <title>{t("jobs.applyTitle")} • SHD Careers</title>
      </Helmet>

      <style>{`
        /* --------- FIX 1: Back button not under navbar --------- */
        :root{
          --navbar-h: 78px; /* ปรับได้ให้ตรงกับ Navbar ของคุณ */
        }
        .applySection{
          scroll-margin-top: calc(var(--navbar-h) + 18px);
        }
        .backWrap{
          position: sticky;
          top: calc(env(safe-area-inset-top, 0px) + var(--navbar-h) + 10px);
          z-index: 90;
          pointer-events: none;
          margin-top: 6px;
        }
        .backWrap > *{ pointer-events: auto; }

        /* Background */
        .applyBg{ position: relative; isolation: isolate; }
        .applyBg:before{
          content:""; position:absolute; inset:0;
          background:
            radial-gradient(900px 520px at 18% 10%, rgba(99,102,241,.16), transparent 55%),
            radial-gradient(700px 520px at 82% 22%, rgba(14,165,233,.14), transparent 55%),
            radial-gradient(600px 420px at 60% 95%, rgba(16,185,129,.10), transparent 60%);
          pointer-events:none; z-index:-2;
        }
        .applyBg:after{
          content:""; position:absolute; inset:0;
          background: linear-gradient(to bottom, rgba(255,255,255,.92), rgba(255,255,255,.98));
          pointer-events:none; z-index:-1;
        }

        .glassCard{
          background: rgba(255,255,255,.75);
          border: 1px solid rgba(148,163,184,.35);
          box-shadow: 0 18px 45px rgba(15,23,42,.08);
          backdrop-filter: blur(10px);
        }
        .softHr{
          height:1px;
          background: linear-gradient(to right, transparent, rgba(148,163,184,.4), transparent);
        }
        .hoverLift{ transition: transform .15s ease, box-shadow .15s ease; }
        .hoverLift:hover{ transform: translateY(-1px); box-shadow: 0 22px 55px rgba(15,23,42,.10); }

        .input{
          width:100%;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.6);
          padding: 10px 12px;
          background: rgba(255,255,255,.85);
          font-size: 14px;
        }
        .input:focus{
          outline: none;
          box-shadow: 0 0 0 3px rgba(59,130,246,.25);
          border-color: rgba(59,130,246,.5);
        }

        .skillsGrid{ display:grid; gap:12px; }
        @media (min-width: 768px){
          .skillsGrid{ grid-template-columns: 260px 1fr; align-items:start; }
        }
        .tabsRow{
          display:flex; gap:8px; overflow:auto;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:none;
          padding-bottom:2px;
        }
        .tabsRow::-webkit-scrollbar{ display:none; }

        .frameTitle{
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          padding: 10px 12px;
          border-bottom: 1px dashed rgba(148,163,184,.55);
        }
        .frameTitle strong{ font-size: 12px; color: rgb(71,85,105); letter-spacing:.02em; text-transform: uppercase; }
        .frameBody{ padding: 12px; }

        /* --------- FIX 2: Skills show full text (no truncate, width by text) --------- */
        .skillPills{
          display:flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: flex-start;
        }
        .skillPill{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.55);
          background: rgba(255,255,255,.92);
          font-weight: 800;
          font-size: 13px;
          color: rgb(30,41,59);
          line-height: 1;
          white-space: nowrap; /* ไม่ตัดคำ */
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
        }
        .skillPill:hover{
          background: rgba(241,245,249,.92);
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15,23,42,.08);
        }
        .skillPillOn{
          border-color: rgba(59,130,246,.45);
          background: rgba(239,246,255,.95);
          box-shadow: 0 10px 25px rgba(59,130,246,.12);
        }
        .skillPillDisabled{ opacity:.5; cursor:not-allowed; }

        /* Files list */
        .fileRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.45);
          background: rgba(255,255,255,.85);
        }
        .fileMeta{ min-width:0; display:flex; align-items:center; gap:10px; }
        .fileName{ font-weight: 700; font-size: 13px; color: rgb(15,23,42); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fileSize{ font-size: 11px; color: rgb(100,116,139); margin-top: 2px; }
      `}</style>

      <Modal
        open={modalOpen}
        title={submitPhase === "done" ? (result?.ok ? "Application submitted" : "Something went wrong") : "Submitting your application"}
        desc={submitHint}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StepPill label="Validate" done={submitPhase !== "idle" && submitPhase !== "validating"} active={submitPhase === "validating"} />
            <StepPill label="Upload" done={submitPhase === "sending" || submitPhase === "done"} active={submitPhase === "uploading"} />
            <StepPill label="Send" done={submitPhase === "done"} active={submitPhase === "sending"} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              {submitPhase === "done" ? (
                result?.ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
                )
              ) : (
                <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-slate-600" />
              )}

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {submitPhase === "done"
                    ? result?.ok
                      ? "We’ve received your application."
                      : "We couldn’t submit your application."
                    : "Please wait…"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {submitPhase === "done"
                    ? result?.ok
                      ? "You can close this popup. We’ll contact you if your profile matches."
                      : result?.message || "Please try again."
                    : "Do not close or refresh this page while we’re processing."}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (submitting && submitPhase !== "done") return;
                setModalOpen(false);
              }}
              disabled={submitting && submitPhase !== "done"}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <section className="container-page applyBg pb-14 pt-6 sm:pt-10 applySection">
        <div className="backWrap">
          <Link to={job ? `/jobs/${encodeURIComponent(job.job_id)}` : "/jobs"} className="btn btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          </div>
        ) : !job ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">{t("common.notFound")}</div>
        ) : (
          <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[1fr_360px]">
            {/* Main */}
            <div className="glassCard hoverLift rounded-3xl p-5 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{t("jobs.applyTitle")}</h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {job.title} • {job.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Secure form
                  </div>
                </div>
              </div>

              <div className="mt-6 softHr" />

              {result && (
                <div
                  className={cn(
                    "mt-6 rounded-2xl border px-4 py-3 text-sm",
                    result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {result.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <div className="min-w-0">
                      <div className="font-semibold">{result.ok ? t("jobs.form.success") : "Submit failed"}</div>
                      {!result.ok ? <div className="mt-1 text-sm">{result.message || t("jobs.form.fail")}</div> : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Personal */}
              <div className="mt-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <div className="text-sm font-black text-slate-900">{t("jobs.form.personal")}</div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label={t("jobs.form.firstName")} required>
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>

                  <Field label={t("jobs.form.lastName")} required>
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>

                  <Field label={t("jobs.form.email")} required>
                    <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>

                  <Field label={t("jobs.form.phone")} hint={`Preview: ${fullPhone}`} required>
                    <div className="grid grid-cols-[150px_1fr] gap-2">
                      <select className="input" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value as any)}>
                        {PHONE_COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone number"
                        inputMode="numeric"
                      />
                    </div>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Current Address (Country)" hint={`Saved as: ${addressCombined}`} required>
                      <div className="grid gap-2 md:grid-cols-2">
                        <select className="input" value={residenceCountry} onChange={(e) => setResidenceCountry(e.target.value)}>
                          {RESIDENCE_COUNTRIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>

                        <input className="input" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="Address detail (optional)" />
                      </div>

                      {residenceCountry === "Other" && (
                        <div className="mt-2">
                          <input
                            className="input"
                            value={residenceCountryOther}
                            onChange={(e) => setResidenceCountryOther(e.target.value)}
                            placeholder="Please specify country (e.g., Singapore)"
                          />
                        </div>
                      )}
                    </Field>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="mt-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">{t("jobs.form.education")}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEducation((p) => (p.length >= 5 ? p : [...p, { level: "", school: "", from: "", to: "" }]))}
                  >
                    + {t("jobs.form.addEducation")}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {education.map((e, idx) => (
                    <div key={idx} className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
                      <div className="grid gap-4">
                        <Field label="Education Level">
                          <select
                            className="input"
                            value={e.level}
                            onChange={(ev) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, level: ev.target.value } : x)))}
                          >
                            <option value="">Select level...</option>
                            {EDUCATION_LEVELS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="School / Institute">
                          <input
                            className="input"
                            value={e.school}
                            onChange={(ev) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, school: ev.target.value } : x)))}
                          />
                        </Field>

                        <MonthRange
                          from={e.from}
                          to={e.to}
                          onChangeFrom={(v) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, from: v } : x)))}
                          onChangeTo={(v) => setEducation((p) => p.map((x, i) => (i === idx ? { ...x, to: v } : x)))}
                        />
                      </div>

                      {education.length > 1 && (
                        <div className="mt-4 flex justify-end">
                          <button type="button" className="btn btn-ghost" onClick={() => setEducation((p) => p.filter((_, i) => i !== idx))}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="mt-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900">{t("jobs.form.experience")}</div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setExperience((p) => (p.length >= 20 ? p : [...p, { company: "", title: "", from: "", to: "" }]))}
                  >
                    + {t("jobs.form.addExperience")}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {experience.map((e, idx) => (
                    <div key={idx} className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Company">
                          <input
                            className="input"
                            value={e.company}
                            onChange={(ev) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, company: ev.target.value } : x)))}
                          />
                        </Field>

                        <Field label="Title">
                          <input
                            className="input"
                            value={e.title}
                            onChange={(ev) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, title: ev.target.value } : x)))}
                          />
                        </Field>

                        <div className="md:col-span-2">
                          <MonthRange
                            from={e.from}
                            to={e.to}
                            onChangeFrom={(v) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, from: v } : x)))}
                            onChangeTo={(v) => setExperience((p) => p.map((x, i) => (i === idx ? { ...x, to: v } : x)))}
                          />
                        </div>
                      </div>

                      {experience.length > 1 && (
                        <div className="mt-4 flex justify-end">
                          <button type="button" className="btn btn-ghost" onClick={() => setExperience((p) => p.filter((_, i) => i !== idx))}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="mt-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900">{t("jobs.form.skills")}</div>
                  <div className="text-xs text-slate-600">Selected: {skills.length}/8</div>
                </div>

                {skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span key={s} className="badge border-slate-200 bg-white text-slate-800">
                        {s}
                        <button
                          type="button"
                          className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-slate-100"
                          onClick={() => removeSkill(s)}
                          aria-label="remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-10" value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} placeholder="Search skills..." />
                  </div>
                </div>

                <div className="mt-3 skillsGrid">
                  {/* Categories */}
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80">
                    <div className="frameTitle">
                      <strong>Skill Categories</strong>
                      <span className="text-[11px] text-slate-500">Pick a group</span>
                    </div>

                    <div className="frameBody md:hidden">
                      <div className="tabsRow">
                        {Object.keys(SKILL_CATEGORIES).map((k) => {
                          const active = k === skillTab;
                          return (
                            <button
                              key={k}
                              type="button"
                              className={cn("badge whitespace-nowrap transition", active ? "border-blue-200 bg-blue-50 text-blue-700" : "hover:bg-slate-100")}
                              onClick={() => setSkillTab(k)}
                            >
                              {SKILL_CATEGORIES[k].title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <div className="p-3">
                        <div className="flex flex-col gap-2">
                          {Object.keys(SKILL_CATEGORIES).map((k) => {
                            const active = k === skillTab;
                            return (
                              <button
                                key={k}
                                type="button"
                                className={cn(
                                  "w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition",
                                  active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                                onClick={() => setSkillTab(k)}
                              >
                                {SKILL_CATEGORIES[k].title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80">
                    <div className="frameTitle">
                      <strong>{skillTabTitle}</strong>
                      <span className="text-[11px] text-slate-500">Choose up to 8</span>
                    </div>

                    <div className="frameBody">
                      {/* ✅ pills width by text */}
                      <div className="skillPills">
                        {skillSuggestions.map((s) => {
                          const active = skills.includes(s);
                          const disabledPick = !active && skills.length >= 8;
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={disabledPick}
                              className={cn("skillPill", active && "skillPillOn", disabledPick && "skillPillDisabled")}
                              onClick={() => toggleSkill(s)}
                              title={s}
                            >
                              <span>{s}</span>
                              <span className={cn("text-xs font-black", active ? "text-blue-700" : "text-slate-400")}>
                                {active ? "✓" : "+"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px]">
                        <input
                          className="input"
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          placeholder="Add custom skill (optional)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSkill();
                            }
                          }}
                        />
                        <button type="button" className="btn btn-ghost" onClick={addCustomSkill} disabled={!customSkill.trim() || skills.length >= 8}>
                          Add
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500">Tip: เลือกได้สูงสุด 8 ทักษะ เพื่อให้ทีม HR อ่านง่าย</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other */}
              <div className="mt-10">
                <div className="text-sm font-black text-slate-900">{t("jobs.form.other")}</div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label={t("jobs.form.visa")}>
                    <select className="input" value={visa} onChange={(e) => setVisa(e.target.value)}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </Field>

                  <Field label="Available Start Date">
                    <input type="date" className="input" value={availableStartDate} onChange={(e) => setAvailableStartDate(e.target.value)} />
                  </Field>

                  <Field label={t("jobs.form.url")}>
                    <input className="input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                  </Field>

                  <Field label={t("jobs.form.source")} required>
                    <input className="input" value={source} onChange={(e) => setSource(e.target.value)} />
                  </Field>
                </div>
              </div>

              {/* Files */}
              <div className="mt-10">
                <div className="text-sm font-black text-slate-900">{t("jobs.form.resume")}</div>

                <div className="mt-3">
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setResumeFromInput(f);
                    }}
                  />
                </div>

                {resumeFile && (
                  <div className="mt-3 fileRow">
                    <div className="fileMeta">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <div className="min-w-0">
                        <div className="fileName">{resumeFile.name}</div>
                        <div className="fileSize">{Math.round(resumeFile.size / 1024)} KB</div>
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => setResumeFromInput(null)}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  <div className="text-sm font-black text-slate-900">{t("jobs.form.attachments")}</div>

                  <div className="mt-3">
                    <input ref={attachmentsInputRef} type="file" multiple onChange={(e) => addAttachmentsFromInput(e.target.files)} />
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((f) => {
                        const k = fileKey(f);
                        return (
                          <div key={k} className="fileRow">
                            <div className="fileMeta">
                              <Paperclip className="h-4 w-4 text-slate-500" />
                              <div className="min-w-0">
                                <div className="fileName">{f.name}</div>
                                <div className="fileSize">{Math.round(f.size / 1024)} KB</div>
                              </div>
                            </div>
                            <button type="button" className="btn btn-ghost" onClick={() => removeAttachmentByKey(k)}>
                              <Trash2 className="h-4 w-4" /> Remove
                            </button>
                          </div>
                        );
                      })}
                      <div className="text-[11px] text-slate-500">
                        Total files: {attachments.length} • Total size: {Math.round(attachments.reduce((s, f) => s + f.size, 0) / 1024 / 1024)} MB
                        (limit 50MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                  <div className="text-sm text-slate-700">{t("jobs.form.agree")}</div>
                </div>
              </div>

              <div className="mt-6">
                <button disabled={disabled} onClick={onSubmit} className={"btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {submitting ? t("jobs.form.submitting") : t("jobs.form.submit")}
                </button>

                <div className="mt-3 text-[11px] text-slate-500">By submitting, you confirm the information is accurate and you agree to our policies.</div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="glassCard rounded-3xl p-6">
                <div className="text-xs font-semibold text-slate-500">Job</div>
                <div className="mt-1 text-base font-black text-slate-900">{job.title}</div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                    <div className="text-xs font-semibold text-slate-500">Location</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{job.location}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                    <div className="text-xs font-semibold text-slate-500">Department</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{job.department}</div>
                  </div>
                </div>

                <div className="mt-5 softHr" />

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <div className="text-sm font-black text-slate-900">Tips</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    <li>Resume file must be PDF/DOC/DOCX and ≤ 2MB</li>
                    <li>Attachments total size ≤ 50MB</li>
                    <li>เลือก Skills ไม่เกิน 8 เพื่อความชัดเจน</li>
                    <li>From/To เลือกเป็น “เดือน + ปี” เท่านั้น (ง่ายกว่า)</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
                <div className="text-sm font-black text-slate-900">Privacy</div>
                <div className="mt-2 text-sm text-slate-600">Your information is used only for recruitment and will be handled securely.</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
