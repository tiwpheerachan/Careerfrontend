# -*- coding: utf-8 -*-
"""
SHD Careers — Admin module (Phase 1)
====================================
ระบบหลังบ้านเฟส 1:
  - ล็อกอินด้วยรหัสผ่านชุดเดียว (ADMIN_PASSWORD) -> ออก JWT (HS256, stdlib)
  - ดูรายชื่อผู้สมัคร (list + filter + ค้นหา + แบ่งหน้า)
  - ดูรายละเอียดผู้สมัคร (การศึกษา/ประสบการณ์/skills/ไฟล์แนบ + signed URL)
  - เปลี่ยนสถานะ + ใส่โน้ต
  - สรุปตัวเลข dashboard

โมดูลนี้ "ยืนได้ด้วยตัวเอง" (อ่าน env เอง, สร้าง supabase client เอง)
เพื่อไม่พึ่งพา main.py แบบ circular import — main.py แค่ include_router ก็พอ
"""
from __future__ import annotations

import os
import time
import json
import hmac
import base64
import hashlib
import logging
from typing import Any, Dict, List, Optional

import io
import csv as _csv
from collections import Counter

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

try:
    from supabase import create_client  # type: ignore
except Exception:  # pragma: no cover
    create_client = None  # type: ignore

logger = logging.getLogger("shd-careers.admin")

# ---------------------------
# Config (อ่านจาก env)
# ---------------------------
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
# secret สำหรับเซ็น JWT — ถ้าไม่ตั้ง จะ fallback ไปใช้รหัสผ่าน (ควรตั้งแยกใน prod)
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "").strip() or ADMIN_PASSWORD
ADMIN_TOKEN_TTL_SEC = int(os.getenv("ADMIN_TOKEN_TTL_SEC", str(8 * 60 * 60)))  # 8 ชั่วโมง

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "careers").strip()

SIGNED_URL_TTL_SEC = int(os.getenv("SIGNED_URL_TTL_SEC", str(60 * 60)))  # 1 ชั่วโมง

# สถานะที่อนุญาตให้แอดมินตั้งได้
ALLOWED_STATUS = {"new", "reviewing", "shortlisted", "rejected", "hired"}

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------
# Supabase helper
# ---------------------------
def _sb():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase env not configured")
    if create_client is None:
        raise HTTPException(status_code=500, detail="supabase client not installed")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _data(res: Any) -> Any:
    return getattr(res, "data", None)


def _count(res: Any) -> Optional[int]:
    return getattr(res, "count", None)


# ---------------------------
# JWT (HS256) — stdlib only, ไม่ต้องลง dependency เพิ่ม
# ---------------------------
def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64u_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def make_token() -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"sub": "admin", "iat": now, "exp": now + ADMIN_TOKEN_TTL_SEC}
    seg = (
        _b64u(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + _b64u(json.dumps(payload, separators=(",", ":")).encode())
    )
    sig = hmac.new(ADMIN_JWT_SECRET.encode(), seg.encode(), hashlib.sha256).digest()
    return seg + "." + _b64u(sig)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or not ADMIN_JWT_SECRET:
        return None
    try:
        seg, sig = token.rsplit(".", 1)
        expected = _b64u(hmac.new(ADMIN_JWT_SECRET.encode(), seg.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, sig):
            return None
        _, payload_b64 = seg.split(".", 1)
        payload = json.loads(_b64u_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


async def require_admin(authorization: str = Header(default="")) -> Dict[str, Any]:
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return payload


# ---------------------------
# Brute-force protection (in-memory, เบาๆ)
# ---------------------------
_LOGIN_FAILS: Dict[str, List[float]] = {}
_LOGIN_WINDOW_SEC = 300  # 5 นาที
_LOGIN_MAX_FAILS = 8


def _check_lockout(ip: str) -> None:
    now = time.time()
    fails = [t for t in _LOGIN_FAILS.get(ip, []) if now - t < _LOGIN_WINDOW_SEC]
    _LOGIN_FAILS[ip] = fails
    if len(fails) >= _LOGIN_MAX_FAILS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")


def _record_fail(ip: str) -> None:
    _LOGIN_FAILS.setdefault(ip, []).append(time.time())


# ---------------------------
# Storage signed URL
# ---------------------------
def _signed_url(path: str) -> Optional[str]:
    try:
        sb = _sb()
        res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(path, SIGNED_URL_TTL_SEC)
        url = None
        if isinstance(res, dict):
            url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
        if url and url.startswith("/"):
            url = f"{SUPABASE_URL}/storage/v1{url}"
        return url
    except Exception as e:
        logger.warning("signed_url failed for %s: %s", path, e)
        return None


def _resolve_file_url(stored: Optional[str]) -> Optional[str]:
    """แปลงค่าที่เก็บใน DB เป็น URL ที่ดาวน์โหลดได้จริง
    - 'storage:applications/xxx/resume_...' -> signed URL
    - 'https://...'                          -> ใช้ตรงๆ (public)
    """
    if not stored:
        return None
    if stored.startswith("storage:"):
        return _signed_url(stored[len("storage:"):])
    return stored


# ---------------------------
# Schemas
# ---------------------------
class LoginBody(BaseModel):
    password: str


class StatusBody(BaseModel):
    status: Optional[str] = None
    admin_note: Optional[str] = None


# ---------------------------
# Routes — auth
# ---------------------------
@router.post("/login")
def login(body: LoginBody, x_forwarded_for: str = Header(default="")) -> Dict[str, Any]:
    ip = (x_forwarded_for.split(",")[0].strip() if x_forwarded_for else "local") or "local"
    _check_lockout(ip)

    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD not configured on server")

    ok = hmac.compare_digest((body.password or "").encode(), ADMIN_PASSWORD.encode())
    if not ok:
        _record_fail(ip)
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"ok": True, "token": make_token(), "expires_in": ADMIN_TOKEN_TTL_SEC}


@router.get("/me")
def me(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return {"ok": True, "exp": admin.get("exp")}


# ---------------------------
# Routes — stats (dashboard)
# ---------------------------
@router.get("/stats")
def stats(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    sb = _sb()
    by_status: Dict[str, int] = {}
    total = 0
    try:
        for st in sorted(ALLOWED_STATUS):
            res = sb.table("applications").select("id", count="exact").eq("status", st).limit(1).execute()
            c = _count(res) or 0
            by_status[st] = int(c)
            total += int(c)
        # เผื่อมีแถวที่ status เป็น null/ค่าอื่น
        res_all = sb.table("applications").select("id", count="exact").limit(1).execute()
        total_all = int(_count(res_all) or 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"stats failed: {e}")

    # สรุปงาน (ถ้ายังไม่มีตาราง jobs จะข้ามไปเงียบๆ)
    jobs_summary = {"total": 0, "published": 0, "draft": 0, "closed": 0}
    try:
        jt = sb.table("jobs").select("job_id", count="exact").limit(1).execute()
        jobs_summary["total"] = int(_count(jt) or 0)
        for js in ("published", "draft", "closed"):
            jr = sb.table("jobs").select("job_id", count="exact").eq("status", js).limit(1).execute()
            jobs_summary[js] = int(_count(jr) or 0)
    except Exception:
        pass

    return {
        "ok": True,
        "total": total_all,
        "by_status": by_status,
        "uncategorized": max(0, total_all - total),
        "jobs": jobs_summary,
    }


# ---------------------------
# Routes — applications
# ---------------------------
@router.get("/analytics")
def analytics(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """สรุปข้อมูลเชิงลึกสำหรับ dashboard — งาน/ผู้สมัคร/เทรนด์/conversion"""
    sb = _sb()
    try:
        apps = _data(
            sb.table("applications")
            .select("id,status,job_id,department,source_channel,created_at")
            .limit(1000)
            .execute()
        ) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"analytics(apps) failed: {e}")
    try:
        jobs = _data(
            sb.table("jobs").select("job_id,status,department,title_th,title_en").limit(1000).execute()
        ) or []
    except Exception:
        jobs = []

    job_title = {j["job_id"]: (j.get("title_th") or j.get("title_en") or j["job_id"]) for j in jobs}

    total = len(apps)
    by_status = Counter((a.get("status") or "new") for a in apps)
    by_dept = Counter((a.get("department") or "ไม่ระบุ") for a in apps)
    by_source = Counter(((a.get("source_channel") or "").strip() or "ไม่ระบุ") for a in apps)
    by_job_c = Counter((a.get("job_id") or "") for a in apps)

    # เทรนด์ 30 วันล่าสุด
    today = _dt.datetime.now(_dt.timezone.utc).date()
    days = [today - _dt.timedelta(days=i) for i in range(29, -1, -1)]
    daily_counts: Counter = Counter()
    for a in apps:
        ca = a.get("created_at")
        if ca:
            try:
                daily_counts[_dt.date.fromisoformat(str(ca)[:10])] += 1
            except Exception:
                pass
    daily = [{"date": d.isoformat(), "count": daily_counts.get(d, 0)} for d in days]

    hired = int(by_status.get("hired", 0))
    shortlisted = int(by_status.get("shortlisted", 0))
    rejected = int(by_status.get("rejected", 0))
    hire_rate = round(hired / total, 4) if total else 0.0

    pub_total = sum(1 for j in jobs if j.get("status") == "published")
    zero_jobs = [
        {"job_id": j["job_id"], "title": job_title.get(j["job_id"], j["job_id"])}
        for j in jobs
        if j.get("status") == "published" and by_job_c.get(j["job_id"], 0) == 0
    ]

    def as_list(counter: Counter, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        items = sorted(counter.items(), key=lambda x: (-x[1], str(x[0])))
        if limit:
            items = items[:limit]
        return [{"name": k, "count": v} for k, v in items]

    by_job = [
        {"job_id": k, "title": job_title.get(k, k), "count": v}
        for k, v in sorted(by_job_c.items(), key=lambda x: -x[1])
        if k
    ]

    return {
        "ok": True,
        "totals": {
            "applications": total,
            "jobs": len(jobs),
            "published": pub_total,
            "hired": hired,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "hire_rate": hire_rate,
            "avg_per_published": round(total / pub_total, 1) if pub_total else 0,
        },
        "by_status": dict(by_status),
        "by_department": as_list(by_dept),
        "by_source": as_list(by_source),
        "by_job": by_job,
        "daily": daily,
        "zero_jobs": zero_jobs,
        "jobs_summary": {
            "total": len(jobs),
            "published": pub_total,
            "draft": sum(1 for j in jobs if j.get("status") == "draft"),
            "closed": sum(1 for j in jobs if j.get("status") == "closed"),
        },
    }


@router.get("/applications")
def list_applications(
    admin: Dict[str, Any] = Depends(require_admin),
    q: str = "",
    status: str = "",
    job_id: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    sb = _sb()
    start = (page - 1) * page_size
    end = start + page_size - 1

    try:
        query = sb.table("applications").select(
            "id,job_id,first_name,last_name,email,phone,country,department,level,"
            "status,source_channel,created_at,reviewed_at",
            count="exact",
        )
        if status and status in ALLOWED_STATUS:
            query = query.eq("status", status)
        if job_id:
            query = query.eq("job_id", job_id)
        qn = (q or "").strip()
        if qn:
            safe = qn.replace(",", " ").replace("*", " ").replace("(", " ").replace(")", " ")
            query = query.or_(
                f"first_name.ilike.*{safe}*,last_name.ilike.*{safe}*,"
                f"email.ilike.*{safe}*,phone.ilike.*{safe}*"
            )
        query = query.order("created_at", desc=True).range(start, end)
        res = query.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"list applications failed: {e}")

    rows = _data(res) or []
    total = _count(res)
    if total is None:
        total = len(rows)

    return {
        "ok": True,
        "rows": rows,
        "total": int(total),
        "page": page,
        "page_size": page_size,
    }


@router.get("/applications/export")
def export_applications(
    admin: Dict[str, Any] = Depends(require_admin),
    q: str = "",
    status: str = "",
) -> Response:
    """ดาวน์โหลดผู้สมัครเป็น CSV (รองรับ filter เดียวกับหน้า list)"""
    sb = _sb()
    try:
        query = sb.table("applications").select(
            "id,created_at,status,job_id,first_name,last_name,email,phone,"
            "country,department,level,address,visa_required,available_start_date,"
            "website_url,source_channel,resume_url,transcript_url,admin_note,reviewed_at"
        )
        if status and status in ALLOWED_STATUS:
            query = query.eq("status", status)
        qn = (q or "").strip()
        if qn:
            safe = qn.replace(",", " ").replace("*", " ").replace("(", " ").replace(")", " ")
            query = query.or_(
                f"first_name.ilike.*{safe}*,last_name.ilike.*{safe}*,"
                f"email.ilike.*{safe}*,phone.ilike.*{safe}*"
            )
        res = query.order("created_at", desc=True).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"export failed: {e}")

    cols = [
        "id", "created_at", "status", "job_id", "first_name", "last_name", "email", "phone",
        "country", "department", "level", "address", "visa_required", "available_start_date",
        "website_url", "source_channel", "resume_url", "transcript_url", "admin_note", "reviewed_at",
    ]
    buf = io.StringIO()
    writer = _csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow({c: r.get(c, "") for c in cols})

    # BOM ให้ Excel เปิดภาษาไทยได้ถูกต้อง
    content = "﻿" + buf.getvalue()
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )


@router.get("/applications/{application_id}")
def get_application(
    application_id: str,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    sb = _sb()
    try:
        res = sb.table("applications").select("*").eq("id", application_id).limit(1).execute()
        rows = _data(res) or []
        if not rows:
            raise HTTPException(status_code=404, detail="Application not found")
        app_row = rows[0]

        edu = _data(sb.table("application_educations").select("*").eq("application_id", application_id).execute()) or []
        exp = _data(sb.table("application_experiences").select("*").eq("application_id", application_id).execute()) or []
        sk = _data(sb.table("application_skills").select("*").eq("application_id", application_id).execute()) or []
        att = _data(sb.table("application_attachments").select("*").eq("application_id", application_id).execute()) or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"get application failed: {e}")

    # แนบ URL ที่ดาวน์โหลดได้ (signed สำหรับไฟล์ใน storage)
    app_row["resume_download_url"] = _resolve_file_url(app_row.get("resume_url"))
    app_row["transcript_download_url"] = _resolve_file_url(app_row.get("transcript_url"))
    for a in att:
        a["download_url"] = _resolve_file_url(a.get("file_url"))

    return {
        "ok": True,
        "application": app_row,
        "educations": edu,
        "experiences": exp,
        "skills": [s.get("skill") for s in sk if s.get("skill")],
        "attachments": att,
    }


@router.patch("/applications/{application_id}")
def update_application(
    application_id: str,
    body: StatusBody,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    patch: Dict[str, Any] = {}
    if body.status is not None:
        if body.status not in ALLOWED_STATUS:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUS)}")
        patch["status"] = body.status
        patch["reviewed_at"] = __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat()
    if body.admin_note is not None:
        patch["admin_note"] = body.admin_note.strip()

    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sb = _sb()
    try:
        res = sb.table("applications").update(patch).eq("id", application_id).execute()
        rows = _data(res) or []
        if not rows:
            raise HTTPException(status_code=404, detail="Application not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"update application failed: {e}")

    return {"ok": True, "application": rows[0]}


# =====================================================================
# Jobs management (Phase 2)
# =====================================================================
import datetime as _dt

JOB_STATUS = {"draft", "published", "closed"}


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


class JobBody(BaseModel):
    job_id: str
    status: str = "draft"
    country: str = ""
    department: str = ""
    level: str = ""
    quantity: Optional[int] = None
    title_th: str = ""
    title_en: str = ""
    title_zh: str = ""
    location_th: str = ""
    location_en: str = ""
    location_zh: str = ""
    desc_th: str = ""
    desc_en: str = ""
    desc_zh: str = ""
    qual_th: str = ""
    qual_en: str = ""
    qual_zh: str = ""


class JobStatusBody(BaseModel):
    status: str


def _job_payload(b: JobBody) -> Dict[str, Any]:
    d = b.dict()
    d["job_id"] = (d["job_id"] or "").strip()
    d["status"] = (d.get("status") or "draft").strip()
    return d


@router.get("/jobs")
def admin_list_jobs(
    admin: Dict[str, Any] = Depends(require_admin),
    q: str = "",
    status: str = "",
) -> Dict[str, Any]:
    sb = _sb()
    try:
        query = sb.table("jobs").select("*")
        if status and status in JOB_STATUS:
            query = query.eq("status", status)
        res = query.order("updated_at", desc=True).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"list jobs failed: {e}")

    qn = (q or "").strip().lower()
    if qn:
        def hay(r: Dict[str, Any]) -> str:
            return " ".join(
                str(r.get(k, "") or "")
                for k in ("job_id", "title_th", "title_en", "title_zh", "department", "level", "country")
            ).lower()
        rows = [r for r in rows if qn in hay(r)]

    # แนบจำนวนผู้สมัครต่อแต่ละงาน
    try:
        apps = _data(sb.table("applications").select("job_id").limit(1000).execute()) or []
        cnt = Counter(a.get("job_id") for a in apps)
        for r in rows:
            r["applicant_count"] = int(cnt.get(r["job_id"], 0))
    except Exception:
        pass

    return {"ok": True, "rows": rows, "total": len(rows)}


@router.get("/job-options")
def admin_job_options(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """ดึงค่า department/level/country ที่ "มีอยู่จริง" ในงาน เพื่อช่วย autocomplete ตอนสร้าง/แก้"""
    sb = _sb()
    try:
        res = sb.table("jobs").select("department,level,country").execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"job options failed: {e}")

    def uniq(key: str) -> List[str]:
        vals = sorted({(r.get(key) or "").strip() for r in rows if (r.get(key) or "").strip()})
        return vals

    return {
        "ok": True,
        "departments": uniq("department"),
        "levels": uniq("level"),
        "countries": uniq("country"),
    }


@router.get("/jobs/{job_id}")
def admin_get_job(job_id: str, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    sb = _sb()
    try:
        res = sb.table("jobs").select("*").eq("job_id", job_id).limit(1).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"get job failed: {e}")
    if not rows:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "job": rows[0]}


@router.post("/jobs")
def admin_create_job(body: JobBody, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    payload = _job_payload(body)
    if not payload["job_id"]:
        raise HTTPException(status_code=400, detail="job_id is required")
    if payload["status"] not in JOB_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(JOB_STATUS)}")

    sb = _sb()
    # กัน job_id ซ้ำ
    exists = _data(sb.table("jobs").select("job_id").eq("job_id", payload["job_id"]).limit(1).execute()) or []
    if exists:
        raise HTTPException(status_code=409, detail=f"job_id '{payload['job_id']}' already exists")

    payload["created_at"] = _now_iso()
    payload["updated_at"] = _now_iso()
    try:
        res = sb.table("jobs").insert(payload).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"create job failed: {e}")
    return {"ok": True, "job": (rows[0] if rows else payload)}


@router.put("/jobs/{job_id}")
def admin_update_job(job_id: str, body: JobBody, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    payload = _job_payload(body)
    if payload["status"] not in JOB_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(JOB_STATUS)}")
    payload.pop("job_id", None)  # ไม่ให้แก้ PK
    payload["updated_at"] = _now_iso()

    sb = _sb()
    try:
        res = sb.table("jobs").update(payload).eq("job_id", job_id).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"update job failed: {e}")
    if not rows:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "job": rows[0]}


@router.patch("/jobs/{job_id}/status")
def admin_set_job_status(job_id: str, body: JobStatusBody, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    if body.status not in JOB_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(JOB_STATUS)}")
    sb = _sb()
    try:
        res = sb.table("jobs").update({"status": body.status, "updated_at": _now_iso()}).eq("job_id", job_id).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"set job status failed: {e}")
    if not rows:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "job": rows[0]}


@router.delete("/jobs/{job_id}")
def admin_delete_job(job_id: str, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    sb = _sb()
    try:
        res = sb.table("jobs").delete().eq("job_id", job_id).execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"delete job failed: {e}")
    if not rows:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, "deleted": job_id}


# =====================================================================
# Site content / CMS (Phase 3)
# =====================================================================
class ContentBody(BaseModel):
    key: str
    lang: str
    value: Any


@router.get("/content")
def admin_list_content(
    admin: Dict[str, Any] = Depends(require_admin),
    lang: str = "th",
) -> Dict[str, Any]:
    sb = _sb()
    try:
        res = sb.table("site_content").select("key,value,updated_at").eq("lang", lang).execute()
        rows = _data(res) or []
    except Exception:
        # ตาราง site_content ยังไม่ถูกสร้าง -> คืนค่าว่าง ให้หน้า CMS โหลดได้ (ยังบันทึกไม่ได้จนกว่าจะรัน migration 003)
        rows = []
    return {"ok": True, "lang": lang, "items": {r["key"]: r.get("value") for r in rows}}


@router.put("/content")
def admin_upsert_content(body: ContentBody, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    key = (body.key or "").strip()
    lang = (body.lang or "").strip().lower()
    if not key or lang not in JOB_LANGS_CMS:
        raise HTTPException(status_code=400, detail="key required and lang must be th/en/zh")

    payload = {"key": key, "lang": lang, "value": body.value, "updated_at": _now_iso()}
    sb = _sb()
    try:
        res = sb.table("site_content").upsert(payload, on_conflict="key,lang").execute()
        rows = _data(res) or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"save content failed: {e}")
    return {"ok": True, "item": (rows[0] if rows else payload)}


@router.delete("/content")
def admin_delete_content(
    key: str,
    lang: str,
    admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    sb = _sb()
    try:
        sb.table("site_content").delete().eq("key", key).eq("lang", lang).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"delete content failed: {e}")
    return {"ok": True, "deleted": {"key": key, "lang": lang}}


JOB_LANGS_CMS = {"th", "en", "zh"}
