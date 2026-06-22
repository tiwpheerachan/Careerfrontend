-- =====================================================================
-- SHD Careers — Phase 2: ตารางประกาศงาน (jobs) ย้ายจาก Google Sheet -> Supabase
-- รันใน Supabase: Dashboard -> SQL Editor -> วางทั้งไฟล์ -> Run
-- ปลอดภัย/รันซ้ำได้
--
-- เก็บ 3 ภาษาแยกคอลัมน์ ตรงกับโครงสร้าง Google Sheet เดิม
-- (title/location/desc/qual × th/en/zh)
-- =====================================================================

create table if not exists jobs (
  job_id      text primary key,              -- เช่น SHD-TH-HRBP
  status      text default 'draft',          -- draft | published | closed
  country     text,
  department  text,
  level       text,
  quantity    int,

  title_th    text, title_en    text, title_zh    text,
  location_th text, location_en text, location_zh text,
  desc_th     text, desc_en     text, desc_zh     text,
  qual_th     text, qual_en     text, qual_zh     text,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_jobs_status     on jobs (status);
create index if not exists idx_jobs_department on jobs (department);
create index if not exists idx_jobs_level      on jobs (level);
create index if not exists idx_jobs_country    on jobs (country);

-- public อ่านงานผ่าน backend (service_role) เท่านั้น -> เปิด RLS ไม่ใส่ policy
alter table jobs enable row level security;
