-- =====================================================================
-- SHD Careers — FULL schema (ใช้ตอนสร้าง Supabase project ใหม่)
-- รันใน Supabase: Dashboard -> SQL Editor -> วางทั้งไฟล์ -> Run
-- ปลอดภัย/รันซ้ำได้ (idempotent) — สร้างตารางทั้งหมดที่ระบบ apply + admin ใช้
--
-- ⚠️ ถ้าโปรเจกต์เดิมแค่ถูก "พัก" (paused) ไม่ต้องรันไฟล์นี้
--    ให้ Restore โปรเจกต์เดิมแล้วรัน 001_admin_phase1.sql พอ
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ตารางหลัก: ใบสมัคร
-- ---------------------------------------------------------------------
create table if not exists applications (
  id                   uuid primary key default gen_random_uuid(),
  job_id               text,
  country              text,
  department           text,
  level                text,
  first_name           text,
  last_name            text,
  email                text,
  phone                text,
  address              text,
  visa_required        boolean default false,
  available_start_date text,
  website_url          text,
  source_channel       text,
  terms_accepted       boolean default false,
  resume_url           text,
  transcript_url       text,
  -- ฟิลด์สำหรับแอดมิน (Phase 1)
  status               text default 'new',   -- new|reviewing|shortlisted|rejected|hired
  admin_note           text,
  reviewed_at          timestamptz,
  created_at           timestamptz default now()
);

-- ---------------------------------------------------------------------
-- ตารางลูก
-- ---------------------------------------------------------------------
create table if not exists application_educations (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  degree_level   text,
  institute      text,
  program        text,
  start_month    text,
  end_month      text,
  degree_type    text,
  gpa            text
);

create table if not exists application_experiences (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  company        text,
  role           text,
  start_month    text,
  end_month      text
);

create table if not exists application_skills (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  skill          text
);

create table if not exists application_attachments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  file_name      text,
  file_url       text
);

-- ---------------------------------------------------------------------
-- Index ช่วยให้ลิสต์/กรองในแอดมินเร็วขึ้น
-- ---------------------------------------------------------------------
create index if not exists idx_applications_created_at on applications (created_at desc);
create index if not exists idx_applications_status     on applications (status);
create index if not exists idx_applications_job_id     on applications (job_id);
create index if not exists idx_edu_app_id  on application_educations (application_id);
create index if not exists idx_exp_app_id  on application_experiences (application_id);
create index if not exists idx_skill_app_id on application_skills (application_id);
create index if not exists idx_att_app_id  on application_attachments (application_id);

-- ---------------------------------------------------------------------
-- Security: เปิด RLS แล้วไม่ใส่ policy = ห้าม public/anon เข้าถึง
-- (backend ใช้ service_role key ซึ่ง bypass RLS อยู่แล้ว จึงทำงานปกติ)
-- ---------------------------------------------------------------------
alter table applications            enable row level security;
alter table application_educations  enable row level security;
alter table application_experiences enable row level security;
alter table application_skills      enable row level security;
alter table application_attachments enable row level security;

-- ---------------------------------------------------------------------
-- Storage bucket สำหรับไฟล์ resume/transcript/แนบ (ชื่อ 'careers')
-- public = true เพื่อให้ลิงก์ resume แบบเดิมทำงาน (admin ยังออก signed URL ได้)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('careers', 'careers', true)
on conflict (id) do nothing;
