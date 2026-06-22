-- =====================================================================
-- SHD Careers — Phase 3: CMS (จัดการเนื้อหาเว็บ)
-- รันใน Supabase: Dashboard -> SQL Editor -> วางทั้งไฟล์ -> Run
-- ปลอดภัย/รันซ้ำได้
--
-- หลักการ: เก็บเฉพาะ "ค่าที่แอดมินแก้ทับ (override)" ต่อ key+ภาษา
-- เว็บโหลด default จากไฟล์ i18n เดิม แล้ว merge override ทับ
-- => DB ว่าง = ใช้ข้อความ default ปกติ (ไม่พัง)
-- =====================================================================

create table if not exists site_content (
  key        text not null,           -- เช่น 'nav.about', 'about.story.p1'
  lang       text not null,           -- th | en | zh
  value      jsonb not null,          -- string / array / object
  updated_at timestamptz default now(),
  updated_by text,
  primary key (key, lang)
);

create index if not exists idx_site_content_lang on site_content (lang);

-- public อ่านผ่าน backend (service_role) -> เปิด RLS ไม่ใส่ policy
alter table site_content enable row level security;
