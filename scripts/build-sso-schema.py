"""
Builds the resource sheet the Central Login console imports
(App → Permissions → upload Excel), as in shd_onelink.

Run: python3 scripts/build-sso-schema.py   (needs openpyxl)

The keys must match lib/auth/permissions.ts (ResourceKey): the app asks
/authz/effective for exactly these. What each level means is written in the
description, so whoever assigns roles in the console reads what they grant.
No capabilities or scopes: the careers admin has neither.
"""

import csv
from pathlib import Path

from openpyxl import Workbook

COLUMNS = ["key", "name", "rtype", "parent", "verbs", "sensitive", "description"]

RESOURCES = [
    {
        "key": "jobs",
        "name": "ตำแหน่งงาน",
        "rtype": "table",
        "verbs": "",
        "sensitive": "FALSE",
        "description": "ตำแหน่งงานบนเว็บสมัครงาน — view = ดูรายการและหน้าแก้ไข (อ่านอย่างเดียว) · "
        "edit = สร้าง แก้ เปิด/ปิดรับสมัคร · manage = ลบ",
    },
    {
        "key": "applications",
        "name": "ผู้สมัคร",
        "rtype": "table",
        "verbs": "export",
        "sensitive": "TRUE",
        "description": "ใบสมัครและไฟล์เรซูเม่ (ข้อมูลส่วนบุคคล) — view = ดูผู้สมัคร ไฟล์ และภาพรวม · "
        "edit = เปลี่ยนสถานะ เขียน/ลบโน้ต · manage = ลบใบสมัคร และส่งออก CSV",
    },
    {
        "key": "content",
        "name": "ข้อความบนเว็บ",
        "rtype": "page",
        "verbs": "",
        "sensitive": "FALSE",
        "description": "ข้อความบนหน้าเว็บสาธารณะ (th/en/zh) — view = ดู · edit = แก้และคืนค่าเดิม",
    },
]

out = Path(__file__).resolve().parent.parent / "sso-schema"
out.mkdir(exist_ok=True)

book = Workbook()
sheet = book.active
sheet.title = "resources"
sheet.append(COLUMNS)
for row in RESOURCES:
    sheet.append([row.get(column) or None for column in COLUMNS])
book.save(out / "resources.xlsx")

# The same rows as CSV, so a change shows up readably in a diff.
with open(out / "resources.csv", "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=COLUMNS)
    writer.writeheader()
    for row in RESOURCES:
        writer.writerow({column: row.get(column, "") for column in COLUMNS})

print(f"wrote {out / 'resources.xlsx'} and resources.csv ({len(RESOURCES)} resources)")
