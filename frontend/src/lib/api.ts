import type { Job, JobsResponse, Language } from "./types";
import { MOCK_JOBS } from "./mock";

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

// Query params helper
function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim().length) sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function isObj(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null;
}

function normalizeJobsResponse(data: unknown): JobsResponse {
  // ✅ backend: { ok, version, rows, total }
  if (isObj(data) && Array.isArray((data as any).rows)) {
    const rows = ((data as any).rows as unknown[]).filter((x) => isObj(x) && String((x as any).job_id || "").trim());
    return {
      jobs: rows as Job[],
      total: rows.length,
      version: typeof (data as any).version === "string" ? (data as any).version : undefined,
    };
  }

  // ✅ demo/old: { jobs, total }
  if (isObj(data) && Array.isArray((data as any).jobs)) {
    const jobs = ((data as any).jobs as unknown[]).filter((x) => isObj(x) && String((x as any).job_id || "").trim());
    return {
      jobs: jobs as Job[],
      total: typeof (data as any).total === "number" ? (data as any).total : jobs.length,
      version: typeof (data as any).version === "string" ? (data as any).version : undefined,
    };
  }

  // fallback
  return { jobs: [], total: 0 };
}

function normalizeJobDetail(data: unknown): Job | null {
  // backend: { ok:true, job:{...} }
  if (isObj(data) && isObj((data as any).job)) {
    return (data as any).job as Job;
  }
  // old: job object direct
  if (isObj(data) && String((data as any).job_id || "").trim()) {
    return data as Job;
  }
  return null;
}

export async function listJobs(args: {
  lang: Language;
  q?: string;
  country?: string;
  department?: string;
  level?: string;
}): Promise<JobsResponse> {
  if (!API_BASE) {
    const q = (args.q ?? "").toLowerCase().trim();
    const filtered = MOCK_JOBS.filter((j) => j.status === "published")
      .filter((j) => (!args.country || args.country === "ALL" ? true : j.country === args.country))
      .filter((j) => (!args.department || args.department === "ALL" ? true : j.department === args.department))
      .filter((j) => (!args.level || args.level === "ALL" ? true : j.level === args.level))
      .filter((j) => (!q ? true : `${j.title} ${j.department} ${j.level} ${j.location}`.toLowerCase().includes(q)));

    return { jobs: filtered, total: filtered.length };
  }

  const url = `${API_BASE}/jobs${qs({
    lang: args.lang,
    q: args.q,
    country: args.country && args.country !== "ALL" ? args.country : undefined,
    department: args.department && args.department !== "ALL" ? args.department : undefined,
    level: args.level && args.level !== "ALL" ? args.level : undefined,
  })}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  // ✅ อ่าน text แล้วค่อย parse จะ debug ง่ายกว่า + กัน non-json
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (isObj(data) && ((data as any).detail || (data as any).message)) ||
      `Failed to load jobs: ${res.status} ${text.slice(0, 200)}`;
    throw new Error(String(msg));
  }

  return normalizeJobsResponse(data);
}

export async function getJob(jobId: string, lang: Language): Promise<Job | null> {
  if (!API_BASE) {
    return MOCK_JOBS.find((j) => j.job_id === jobId) ?? null;
  }

  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}${qs({ lang })}`, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) return null;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (isObj(data) && ((data as any).detail || (data as any).message)) ||
      `Failed to load job: ${res.status} ${text.slice(0, 200)}`;
    throw new Error(String(msg));
  }

  return normalizeJobDetail(data);
}

export async function submitApplication(
  jobId: string,
  payload: FormData
): Promise<{ ok: boolean; message?: string; application_id?: string }> {
  if (!API_BASE) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(jobId)}`, {
    method: "POST",
    body: payload,
  });

  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || text || `HTTP ${res.status}`;
    return { ok: false, message: String(msg) };
  }

  // backend คืน {ok:true, application_id}
  if (data && typeof data === "object") return data;
  return { ok: true };
}
