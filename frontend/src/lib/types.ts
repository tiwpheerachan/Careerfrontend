export type Language = "th" | "en" | "zh";

export type JobStatus = "published" | "draft" | "closed";

export type Job = {
  job_id: string;
  title: string;
  department: string;
  level: string;
  country: string;

  // feed บางทีอาจมี/ไม่มี
  city?: string;
  location: string;

  description: string;
  qualifications: string;

  responsibilities?: string;
  benefits?: string;

  // ✅ จำนวนที่เปิดรับ (รองรับทั้ง number และ string จาก Apps Script)
  quantity?: number | string;

  // feed มี updated_at ในตัวอย่างของคุณ
  updated_at?: string;

  status: JobStatus;
};

// ✅ ให้ตรงกับสิ่งที่ frontend ใช้อยู่ (jobs/total)
// ✅ รองรับ backend { ok, version, rows, total }
export type JobsResponse = {
  jobs: Job[];
  total: number;
  version?: string;
};
