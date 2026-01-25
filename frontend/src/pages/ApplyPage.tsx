import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, X, Search } from "lucide-react";
import { getJob, submitApplication } from "@/lib/api";
import type { Job, Language } from "@/lib/types";

type Edu = { level: string; school: string; from: string; to: string; note?: string };
type Exp = { company: string; title: string; from: string; to: string; note?: string };

function clampFiles(input: FileList | null, maxBytes: number) {
  if (!input) return null;
  const files = Array.from(input);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > maxBytes) {
    return { ok: false as const, message: `Total file size exceeds ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }
  return { ok: true as const, files };
}

/** Countries for dropdown */
const RESIDENCE_COUNTRIES = ["Thailand", "China", "Indonesia", "Philippines", "Vietnam", "Brazil", "Mexico"] as const;

/** Phone country codes */
const PHONE_COUNTRY_CODES = [
  { code: "+66", label: "Thailand (+66)" },
  { code: "+86", label: "China (+86)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+52", label: "Mexico (+52)" },
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

/** Skills (more, categorized) */
const SKILL_CATEGORIES: Record<
  string,
  { title: string; items: string[] }
> = {
  "Office & Productivity": {
    title: "Office & Productivity",
    items: [
      "Excel",
      "Google Sheets",
      "PowerPoint",
      "Word",
      "Data Entry",
      "Documentation",
      "Reporting",
      "Presentation",
      "Email Communication",
      "Calendar & Scheduling",
    ],
  },
  "Customer & Operations": {
    title: "Customer & Operations",
    items: [
      "Customer Service",
      "Sales Support",
      "Operations",
      "Process Improvement",
      "Logistics",
      "Inventory Management",
      "Order Management",
      "Vendor Management",
      "Quality Assurance",
      "Problem Solving",
    ],
  },
  "Data & Analytics": {
    title: "Data & Analytics",
    items: [
      "Data Analytics",
      "SQL",
      "Python",
      "Power BI",
      "Tableau",
      "Google Looker Studio",
      "A/B Testing",
      "Forecasting",
      "Dashboarding",
      "KPI Tracking",
    ],
  },
  "Engineering": {
    title: "Engineering",
    items: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "REST APIs",
      "Git",
      "Testing",
      "CI/CD",
      "System Design",
    ],
  },
  "Business & Leadership": {
    title: "Business & Leadership",
    items: [
      "Project Management",
      "Stakeholder Management",
      "Communication",
      "Leadership",
      "Teamwork",
      "Time Management",
      "Negotiation",
      "Public Speaking",
      "Business Analysis",
      "Strategy",
    ],
  },
  "E-commerce & Marketing": {
    title: "E-commerce & Marketing",
    items: [
      "E-commerce",
      "Shopee",
      "Lazada",
      "TikTok Shop",
      "Product Listing",
      "Ads Optimization",
      "SEO",
      "Content Writing",
      "Social Media",
      "Campaign Planning",
    ],
  },
};

function normalizePhoneNumber(s: string) {
  // keep digits only
  return (s || "").replace(/[^\d]/g, "");
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

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

  // ✅ phone split: code + number
  const [phoneCode, setPhoneCode] = useState<(typeof PHONE_COUNTRY_CODES)[number]["code"]>("+66");
  const [phoneNumber, setPhoneNumber] = useState("");

  // ✅ address = dropdown country + optional detail
  const [residenceCountry, setResidenceCountry] = useState<(typeof RESIDENCE_COUNTRIES)[number]>("Thailand");
  const [addressDetail, setAddressDetail] = useState("");

  const [education, setEducation] = useState<Edu[]>([{ level: "", school: "", from: "", to: "" }]);
  const [experience, setExperience] = useState<Exp[]>([{ company: "", title: "", from: "", to: "" }]);

  // ✅ better skills UI
  const [skills, setSkills] = useState<string[]>([]);
  const [skillTab, setSkillTab] = useState<string>(Object.keys(SKILL_CATEGORIES)[0] || "Office & Productivity");
  const [skillQuery, setSkillQuery] = useState("");
  const [customSkill, setCustomSkill] = useState("");

  const [visa, setVisa] = useState("No");
  // ✅ calendar date picker
  const [availableStartDate, setAvailableStartDate] = useState(""); // yyyy-mm-dd
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [source, setSource] = useState("");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

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

  const addressCombined = useMemo(() => {
    const detail = (addressDetail || "").trim();
    return detail ? `${residenceCountry} — ${detail}` : residenceCountry;
  }, [residenceCountry, addressDetail]);

  const disabled = useMemo(() => {
    if (submitting) return true;
    if (!job) return true;

    const requiredOk =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      normalizePhoneNumber(phoneNumber).trim() &&
      residenceCountry &&
      source.trim() &&
      agree &&
      resumeFile;

    return !requiredOk;
  }, [submitting, job, firstName, lastName, email, phoneNumber, residenceCountry, source, agree, resumeFile]);

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

    // show some global hits too (but keep UI clean)
    const allItems = Object.values(SKILL_CATEGORIES).flatMap((c) => c.items);
    const globalHits = !q ? [] : allItems.filter((x) => x.toLowerCase().includes(q)).slice(0, 10);

    // prioritize tab results, then global hits (dedup)
    return uniq([...filteredTab, ...globalHits]).slice(0, 30);
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

  async function onSubmit() {
    if (!job) return;
    setResult(null);
    setSubmitting(true);

    try {
      const fd = new FormData();

      // ✅ map to backend field names (ปลอดภัยกว่า)
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

      // ✅ backend parse_skills รองรับ json list หรือ string
      fd.set("skills", JSON.stringify(skills));

      fd.set("education_json", JSON.stringify(education.filter((e) => e.level || e.school || e.from || e.to)));
      fd.set("experience_json", JSON.stringify(experience.filter((e) => e.company || e.title || e.from || e.to)));

      if (resumeFile) fd.append("resume", resumeFile);
      attachments.forEach((f) => fd.append("attachments", f));

      const r = await submitApplication(job.job_id, fd);
      setResult(r);

      if (r.ok) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhoneCode("+66");
        setPhoneNumber("");
        setResidenceCountry("Thailand");
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
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message ?? "Error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{t("jobs.applyTitle")} • SHD Careers</title>
      </Helmet>

      <section className="container-page py-10">
        <Link to={job ? `/jobs/${encodeURIComponent(job.job_id)}` : "/jobs"} className="btn btn-ghost">
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
              <h1 className="text-2xl font-black tracking-tight">{t("jobs.applyTitle")}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {job.title} • {job.location}
              </p>

              {result && (
                <div
                  className={
                    "mt-5 rounded-xl border px-4 py-3 text-sm " +
                    (result.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800")
                  }
                >
                  <div className="flex items-start gap-2">
                    {result.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <div>{result.ok ? t("jobs.form.success") : result.message || t("jobs.form.fail")}</div>
                  </div>
                </div>
              )}

              {/* Personal */}
              <div className="mt-8">
                <div className="text-sm font-black">{t("jobs.form.personal")}</div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.firstName")}</label>
                    <input className="input mt-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.lastName")}</label>
                    <input className="input mt-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.email")}</label>
                    <input className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  {/* ✅ Phone: dropdown + number */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.phone")}</label>
                    <div className="mt-2 grid grid-cols-[150px_1fr] gap-2">
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
                    <div className="mt-1 text-[11px] text-slate-500">Preview: {fullPhone}</div>
                  </div>

                  {/* ✅ Current Address Country dropdown */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Current Address (Country)</label>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <select
                        className="input"
                        value={residenceCountry}
                        onChange={(e) => setResidenceCountry(e.target.value as any)}
                      >
                        {RESIDENCE_COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <input
                        className="input"
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        placeholder="Address detail (optional)"
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Saved as: {addressCombined}</div>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black">{t("jobs.form.education")}</div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setEducation((p) => (p.length >= 5 ? p : [...p, { level: "", school: "", from: "", to: "" }]))
                    }
                  >
                    + {t("jobs.form.addEducation")}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {education.map((e, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* ✅ Education level dropdown */}
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500">Education Level</label>
                          <select
                            className="input mt-2"
                            value={e.level}
                            onChange={(ev) =>
                              setEducation((p) =>
                                p.map((x, i) => (i === idx ? { ...x, level: ev.target.value } : x))
                              )
                            }
                          >
                            <option value="">Select level...</option>
                            {EDUCATION_LEVELS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500">School / Institute</label>
                          <input
                            className="input mt-2"
                            value={e.school}
                            onChange={(ev) =>
                              setEducation((p) =>
                                p.map((x, i) => (i === idx ? { ...x, school: ev.target.value } : x))
                              )
                            }
                          />
                        </div>

                        {/* ✅ Month picker */}
                        <div>
                          <label className="text-xs font-semibold text-slate-500">From</label>
                          <input
                            type="month"
                            className="input mt-2"
                            value={e.from}
                            onChange={(ev) =>
                              setEducation((p) =>
                                p.map((x, i) => (i === idx ? { ...x, from: ev.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">To</label>
                          <input
                            type="month"
                            className="input mt-2"
                            value={e.to}
                            onChange={(ev) =>
                              setEducation((p) =>
                                p.map((x, i) => (i === idx ? { ...x, to: ev.target.value } : x))
                              )
                            }
                          />
                        </div>
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
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black">{t("jobs.form.experience")}</div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setExperience((p) => (p.length >= 20 ? p : [...p, { company: "", title: "", from: "", to: "" }]))
                    }
                  >
                    + {t("jobs.form.addExperience")}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {experience.map((e, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Company</label>
                          <input
                            className="input mt-2"
                            value={e.company}
                            onChange={(ev) =>
                              setExperience((p) => p.map((x, i) => (i === idx ? { ...x, company: ev.target.value } : x)))
                            }
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-500">Title</label>
                          <input
                            className="input mt-2"
                            value={e.title}
                            onChange={(ev) =>
                              setExperience((p) => p.map((x, i) => (i === idx ? { ...x, title: ev.target.value } : x)))
                            }
                          />
                        </div>

                        {/* ✅ Month picker */}
                        <div>
                          <label className="text-xs font-semibold text-slate-500">From</label>
                          <input
                            type="month"
                            className="input mt-2"
                            value={e.from}
                            onChange={(ev) =>
                              setExperience((p) => p.map((x, i) => (i === idx ? { ...x, from: ev.target.value } : x)))
                            }
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-500">To</label>
                          <input
                            type="month"
                            className="input mt-2"
                            value={e.to}
                            onChange={(ev) =>
                              setExperience((p) => p.map((x, i) => (i === idx ? { ...x, to: ev.target.value } : x)))
                            }
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

              {/* ✅ Skills (Clean UI) */}
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black">{t("jobs.form.skills")}</div>
                  <div className="text-xs text-slate-500">Selected: {skills.length}/8</div>
                </div>

                {/* Selected chips */}
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

                {/* Search + Tabs */}
                <div className="mt-4 grid gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-10"
                      value={skillQuery}
                      onChange={(e) => setSkillQuery(e.target.value)}
                      placeholder="Search skills..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.keys(SKILL_CATEGORIES).map((k) => {
                      const active = k === skillTab;
                      return (
                        <button
                          key={k}
                          type="button"
                          className={"badge transition " + (active ? "border-blue-200 bg-blue-50 text-blue-700" : "hover:bg-slate-100")}
                          onClick={() => setSkillTab(k)}
                        >
                          {SKILL_CATEGORIES[k].title}
                        </button>
                      );
                    })}
                  </div>

                  {/* Suggestions */}
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      {skillSuggestions.map((s) => {
                        const active = skills.includes(s);
                        const disabledPick = !active && skills.length >= 8;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={disabledPick}
                            className={
                              "badge transition " +
                              (active
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "hover:bg-slate-100") +
                              (disabledPick ? " opacity-50 cursor-not-allowed" : "")
                            }
                            onClick={() => toggleSkill(s)}
                          >
                            {s}
                            {active ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom skill */}
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px]">
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
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={addCustomSkill}
                        disabled={!customSkill.trim() || skills.length >= 8}
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Tip: เลือกได้สูงสุด 8 ทักษะ เพื่อให้ทีม HR อ่านง่าย
                    </div>
                  </div>
                </div>
              </div>

              {/* Other */}
              <div className="mt-8">
                <div className="text-sm font-black">{t("jobs.form.other")}</div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.visa")}</label>
                    <select className="input mt-2" value={visa} onChange={(e) => setVisa(e.target.value)}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* ✅ calendar */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Available Start Date</label>
                    <input
                      type="date"
                      className="input mt-2"
                      value={availableStartDate}
                      onChange={(e) => setAvailableStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.url")}</label>
                    <input className="input mt-2" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t("jobs.form.source")}</label>
                    <input className="input mt-2" value={source} onChange={(e) => setSource(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Files */}
              <div className="mt-8">
                <div className="text-sm font-black">{t("jobs.form.resume")}</div>
                <div className="mt-3">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) return setResumeFile(null);
                      if (f.size > 2 * 1024 * 1024) {
                        setResult({ ok: false, message: "Resume file must be ≤ 2MB" });
                        e.target.value = "";
                        return;
                      }
                      setResumeFile(f);
                    }}
                  />
                </div>

                <div className="mt-6">
                  <div className="text-sm font-black">{t("jobs.form.attachments")}</div>
                  <div className="mt-3">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const r = clampFiles(e.target.files, 50 * 1024 * 1024);
                        if (!r) return;
                        if (!r.ok) {
                          setResult({ ok: false, message: r.message });
                          e.target.value = "";
                          return;
                        }
                        setAttachments(r.files);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-start gap-3">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <div className="text-sm text-slate-700">{t("jobs.form.agree")}</div>
              </div>

              <div className="mt-6">
                <button
                  disabled={disabled}
                  onClick={onSubmit}
                  className={"btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"}
                >
                  <Upload className="h-4 w-4" />
                  {submitting ? t("jobs.form.submitting") : t("jobs.form.submit")}
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500">Job</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.title}</div>

                <div className="mt-3 text-xs font-semibold text-slate-500">Location</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.location}</div>

                <div className="mt-3 text-xs font-semibold text-slate-500">Department</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.department}</div>
              </div>

              <div className="card p-6">
                <div className="text-sm font-black">Tips</div>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                  <li>Resume file must be PDF/DOC/DOCX and ≤ 2MB</li>
                  <li>Attachments total size ≤ 50MB</li>
                  <li>เลือก Skills ไม่เกิน 8 เพื่อความชัดเจน</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
