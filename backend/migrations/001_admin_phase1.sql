-- =====================================================================
-- SHD Careers — Admin Phase 1 migration
-- รันใน Supabase: Dashboard -> SQL Editor -> วางทั้งไฟล์นี้ -> Run
-- ปลอดภัยกับข้อมูลเดิม (ใช้ IF NOT EXISTS ทั้งหมด, รันซ้ำได้)
-- =====================================================================

-- เพิ่มฟิลด์สำหรับให้แอดมินจัดการสถานะผู้สมัคร
alter table applications add column if not exists status text default 'new';
alter table applications add column if not exists admin_note text;
alter table applications add column if not exists reviewed_at timestamptz;

-- รับประกันว่ามี created_at เพื่อใช้เรียงลำดับ/แบ่งหน้า
alter table applications add column if not exists created_at timestamptz default now();

-- เติมค่า default ให้แถวเก่าที่ status เป็น null
update applications set status = 'new' where status is null;

-- index ช่วยให้ลิสต์/กรองเร็วขึ้น
create index if not exists idx_applications_created_at on applications (created_at desc);
create index if not exists idx_applications_status on applications (status);
create index if not exists idx_applications_job_id on applications (job_id);
