#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import งานจากไฟล์ CSV (โครงสร้าง Google Sheet) เข้าตาราง jobs ใน Supabase
ใช้ REST + service_role key (upsert ตาม job_id — รันซ้ำได้ ไม่สร้างซ้ำ)

วิธีใช้:
  python3 scripts/import_jobs_from_csv.py "/path/to/Thailand - SHD Career - TH-Job.csv"

อ่านค่า SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY จาก env ก่อน
ถ้าไม่มี จะ parse จาก backend/.env ให้อัตโนมัติ
"""
import os
import sys
import csv
import json
import urllib.request

JOB_COLS = [
    "job_id", "status", "country", "department", "level",
    "title_th", "title_en", "title_zh",
    "location_th", "location_en", "location_zh",
    "desc_th", "desc_en", "desc_zh",
    "qual_th", "qual_en", "qual_zh",
]


def load_env():
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and key:
        return url, key
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            if k.strip() == "SUPABASE_URL" and not url:
                url = v
            elif k.strip() == "SUPABASE_SERVICE_ROLE_KEY" and not key:
                key = v
    return url, key


def to_int(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return int(float(s))
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        print("usage: import_jobs_from_csv.py <csv_path>")
        sys.exit(1)
    csv_path = sys.argv[1]
    url, key = load_env()
    if not url or not key:
        print("❌ ไม่พบ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    rows = []
    with open(csv_path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            jid = (r.get("job_id") or "").strip()
            if not jid:
                continue
            payload = {c: (r.get(c) or "").strip() for c in JOB_COLS}
            payload["job_id"] = jid
            payload["status"] = (r.get("status") or "draft").strip() or "draft"
            payload["quantity"] = to_int(r.get("Quantity"))
            rows.append(payload)

    print(f"อ่าน {len(rows)} งานจาก CSV")

    endpoint = f"{url}/rest/v1/jobs?on_conflict=job_id"
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=body, method="POST")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"✅ upsert สำเร็จ HTTP {resp.status} — {len(rows)} งานเข้า Supabase แล้ว")
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:500]}")
        sys.exit(1)


if __name__ == "__main__":
    main()
