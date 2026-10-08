"""
Builds this app's permission sheets for Central Login (App → Permissions →
upload), one per kind, as its templates have them:
  sso-schema/resources.xlsx     resources — key, name, rtype, parent, verbs, sensitive, description
  sso-schema/capabilities.xlsx  capabilities — key, name, description
  sso-schema/scopes.csv         scopes — dim_key, dim_name, value_key, value_name

Run: python3 scripts/build-sso-schema.py   (needs openpyxl)

The resource keys must match lib/auth/permissions.ts (ResourceKey): the app
asks /authz/effective for exactly these. What each level means is written in
the description, so whoever assigns roles in the console reads what they grant.
Capabilities and scopes are empty: the careers admin checks neither — the
levels cover everything, and no rows are limited by brand, warehouse or the like.
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
        "description": "ผู้สมัคร แบบฟอร์มใบสมัคร และผลประเมินสัมภาษณ์ (ข้อมูลส่วนบุคคล) — "
        "view = ดูผู้สมัคร ไฟล์ ภาพรวม แบบฟอร์มใบสมัคร ผลประเมินและลิงก์เชิญ พิมพ์ PDF · "
        "edit = เปลี่ยนสถานะ เขียน/ลบโน้ต ประเมินสัมภาษณ์ เชิญผู้ประเมิน สร้างลิงก์แก้ไขผลประเมิน · "
        "manage = ลบใบสมัคร แบบฟอร์ม และผลประเมิน ส่งออก CSV เห็นข้อมูลอ่อนไหว (PDPA) ในใบสมัคร PDF",
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

CAPABILITY_COLUMNS = ["key", "name", "description"]
CAPABILITIES: list[dict] = []

SCOPE_COLUMNS = ["dim_key", "dim_name", "value_key", "value_name"]
SCOPES: list[dict] = []

out = Path(__file__).resolve().parent.parent / "sso-schema"
out.mkdir(exist_ok=True)


def sheet(name: str, columns: list[str], rows: list[dict]) -> None:
    book = Workbook()
    page = book.active
    page.title = name
    page.append(columns)
    for row in rows:
        page.append([row.get(column) or None for column in columns])
    book.save(out / f"{name}.xlsx")


for row in RESOURCES:
    assert len(row["description"]) <= 500, f"{row['key']}: description over 500 characters"
sheet("resources", COLUMNS, RESOURCES)
sheet("capabilities", CAPABILITY_COLUMNS, CAPABILITIES)

with open(out / "scopes.csv", "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(file, fieldnames=SCOPE_COLUMNS)
    writer.writeheader()
    writer.writerows(SCOPES)

print(
    f"wrote resources.xlsx ({len(RESOURCES)}), capabilities.xlsx ({len(CAPABILITIES)}) "
    f"and scopes.csv ({len(SCOPES)}) in {out}"
)
