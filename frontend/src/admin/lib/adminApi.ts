// Admin API client — แนบ Bearer token อัตโนมัติ + จัดการ 401
// ใช้ VITE_API_BASE เดียวกับเว็บสาธารณะ (ต้องมี backend จริง admin ถึงทำงาน)

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;
const TOKEN_KEY = "shd_admin_token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function hasApiBase(): boolean {
  return !!API_BASE;
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, opts: RequestInit = {}, auth = true): Promise<T> {
  if (!API_BASE) {
    throw new AdminApiError(0, "ยังไม่ได้ตั้งค่า VITE_API_BASE — ระบบแอดมินต้องเชื่อมต่อ backend จริง");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  } catch {
    // fetch โยน TypeError = ต่อ backend ไม่ติด (backend ไม่รัน / ผิด URL / โดน CORS บล็อก)
    throw new AdminApiError(
      0,
      `เชื่อมต่อ backend ไม่ได้ที่ ${API_BASE} — ตรวจว่า backend (uvicorn) รันอยู่ และ VITE_API_BASE ถูกต้อง`
    );
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  // 401 บน request ที่ต้องล็อกอินอยู่แล้ว = เซสชันหมดอายุ -> เด้งออก
  // (ไม่รวมตอน login เพราะ login ส่ง auth=false)
  if (res.status === 401 && auth) {
    clearToken();
    window.dispatchEvent(new Event("admin-unauthorized"));
    throw new AdminApiError(401, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || text || `HTTP ${res.status}`;
    throw new AdminApiError(res.status, String(msg));
  }

  return data as T;
}

// ---------------------------
// Types
// ---------------------------
export type AdminApplication = {
  id: string;
  job_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
  source_channel?: string;
  created_at?: string;
  reviewed_at?: string;
};

export type AdminApplicationDetail = {
  application: AdminApplication & {
    address?: string;
    visa_required?: boolean;
    available_start_date?: string | null;
    website_url?: string;
    terms_accepted?: boolean;
    admin_note?: string;
    resume_url?: string;
    transcript_url?: string;
    resume_download_url?: string | null;
    transcript_download_url?: string | null;
  };
  educations: Array<Record<string, any>>;
  experiences: Array<Record<string, any>>;
  skills: string[];
  attachments: Array<{ file_name?: string; download_url?: string | null; [k: string]: any }>;
};

export type StatsResponse = {
  ok: boolean;
  total: number;
  by_status: Record<string, number>;
  uncategorized: number;
  jobs?: { total: number; published: number; draft: number; closed: number };
};

export type AdminJob = {
  job_id: string;
  status: string; // draft | published | closed
  country?: string;
  department?: string;
  level?: string;
  quantity?: number | null;
  applicant_count?: number;
  title_th?: string;
  title_en?: string;
  title_zh?: string;
  location_th?: string;
  location_en?: string;
  location_zh?: string;
  desc_th?: string;
  desc_en?: string;
  desc_zh?: string;
  qual_th?: string;
  qual_en?: string;
  qual_zh?: string;
  created_at?: string;
  updated_at?: string;
};

export const JOB_STATUS_LIST = ["draft", "published", "closed"] as const;
export const JOB_STATUS_LABEL: Record<string, string> = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่",
  closed: "ปิดรับ",
};

export type JobOptions = {
  ok: boolean;
  departments: string[];
  levels: string[];
  countries: string[];
};

export type NameCount = { name: string; count: number };
export type JobCount = { job_id: string; title: string; count: number };

export type AnalyticsResponse = {
  ok: boolean;
  totals: {
    applications: number;
    jobs: number;
    published: number;
    hired: number;
    shortlisted: number;
    rejected: number;
    hire_rate: number;
    avg_per_published: number;
  };
  by_status: Record<string, number>;
  by_department: NameCount[];
  by_source: NameCount[];
  by_job: JobCount[];
  daily: { date: string; count: number }[];
  zero_jobs: { job_id: string; title: string }[];
  jobs_summary: { total: number; published: number; draft: number; closed: number };
};

export type ListResponse = {
  ok: boolean;
  rows: AdminApplication[];
  total: number;
  page: number;
  page_size: number;
};

export const STATUS_LIST = ["new", "reviewing", "shortlisted", "rejected", "hired"] as const;
export type AppStatus = (typeof STATUS_LIST)[number];

export const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่",
  reviewing: "กำลังพิจารณา",
  shortlisted: "เข้ารอบ",
  rejected: "ไม่ผ่าน",
  hired: "รับเข้าทำงาน",
};

// ---------------------------
// API methods
// ---------------------------
export const adminApi = {
  login(password: string) {
    return request<{ ok: boolean; token: string; expires_in: number }>(
      "/admin/login",
      { method: "POST", body: JSON.stringify({ password }) },
      false
    );
  },

  stats() {
    return request<StatsResponse>("/admin/stats");
  },

  analytics() {
    return request<AnalyticsResponse>("/admin/analytics");
  },

  listApplications(params: {
    q?: string;
    status?: string;
    job_id?: string;
    page?: number;
    page_size?: number;
  }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.job_id) sp.set("job_id", params.job_id);
    sp.set("page", String(params.page ?? 1));
    sp.set("page_size", String(params.page_size ?? 20));
    return request<ListResponse>(`/admin/applications?${sp.toString()}`);
  },

  getApplication(id: string) {
    return request<AdminApplicationDetail>(`/admin/applications/${encodeURIComponent(id)}`);
  },

  async exportApplications(params: { q?: string; status?: string } = {}): Promise<Blob> {
    if (!API_BASE) throw new AdminApiError(0, "ยังไม่ได้ตั้งค่า VITE_API_BASE");
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    const res = await fetch(`${API_BASE}/admin/applications/export?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event("admin-unauthorized"));
      throw new AdminApiError(401, "เซสชันหมดอายุ");
    }
    if (!res.ok) throw new AdminApiError(res.status, "ดาวน์โหลดไม่สำเร็จ");
    return res.blob();
  },

  updateApplication(id: string, body: { status?: string; admin_note?: string }) {
    return request<{ ok: boolean; application: AdminApplication }>(
      `/admin/applications/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) }
    );
  },

  // ----- Jobs -----
  listJobs(params: { q?: string; status?: string } = {}) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return request<{ ok: boolean; rows: AdminJob[]; total: number }>(
      `/admin/jobs${qs ? `?${qs}` : ""}`
    );
  },

  jobOptions() {
    return request<JobOptions>("/admin/job-options");
  },

  getJob(jobId: string) {
    return request<{ ok: boolean; job: AdminJob }>(`/admin/jobs/${encodeURIComponent(jobId)}`);
  },

  createJob(body: AdminJob) {
    return request<{ ok: boolean; job: AdminJob }>("/admin/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateJob(jobId: string, body: AdminJob) {
    return request<{ ok: boolean; job: AdminJob }>(`/admin/jobs/${encodeURIComponent(jobId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  setJobStatus(jobId: string, status: string) {
    return request<{ ok: boolean; job: AdminJob }>(
      `/admin/jobs/${encodeURIComponent(jobId)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
  },

  deleteJob(jobId: string) {
    return request<{ ok: boolean; deleted: string }>(`/admin/jobs/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
  },

  // ----- CMS content -----
  listContent(lang: string) {
    return request<{ ok: boolean; lang: string; items: Record<string, any> }>(
      `/admin/content?lang=${encodeURIComponent(lang)}`
    );
  },

  saveContent(key: string, lang: string, value: any) {
    return request<{ ok: boolean }>("/admin/content", {
      method: "PUT",
      body: JSON.stringify({ key, lang, value }),
    });
  },

  deleteContent(key: string, lang: string) {
    return request<{ ok: boolean }>(
      `/admin/content?key=${encodeURIComponent(key)}&lang=${encodeURIComponent(lang)}`,
      { method: "DELETE" }
    );
  },
};
