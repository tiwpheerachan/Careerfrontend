# -*- coding: utf-8 -*-
from __future__ import annotations

import os
import json
import re
import logging
import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ✅ โหลด .env ตั้งแต่ตอน import (ต้องมาก่อนอ่าน os.getenv)
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # type: ignore

if load_dotenv is not None:
    # 1) backend/.env (ตอนรันจากโฟลเดอร์ backend)
    load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"), override=False)
    # 2) backend/app/.env (กันพลาด)
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)

try:
    # supabase-py v2
    from supabase import create_client  # type: ignore
except Exception:
    create_client = None  # type: ignore


# ---------------------------
# Logging
# ---------------------------
logger = logging.getLogger("shd-careers")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())


# ---------------------------
# Config
# ---------------------------
APP_NAME = os.getenv("APP_NAME", "SHD Careers API")
APP_ENV = os.getenv("APP_ENV", "local")

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

GOOGLE_JOBS_FEED_URL = os.getenv("GOOGLE_JOBS_FEED_URL", "").strip()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "careers").strip()

HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "25"))

# ✅ Jobs cache (ยิ่งทำให้เร็วขึ้นมาก)
JOBS_CACHE_TTL_SEC = int(os.getenv("JOBS_CACHE_TTL_SEC", "60"))  # แนะนำ 60-180

# Limits
MAX_RESUME_BYTES = 2 * 1024 * 1024
MAX_ATTACH_TOTAL_BYTES = 50 * 1024 * 1024

ALLOWED_RESUME_EXT = {".pdf", ".doc", ".docx"}
ALLOWED_ATTACH_EXT = {
    ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".txt", ".html",
    ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".rar"
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_env(name: str, value: str) -> None:
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing env var: {name}")


def safe_filename(name: str) -> str:
    if not name:
        return "file"
    keep = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-() "
    cleaned = "".join([c if c in keep else "_" for c in name]).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned[:180] or "file"


def get_ext(name: str) -> str:
    name = name or ""
    m = re.search(r"(\.[A-Za-z0-9]+)$", name)
    return (m.group(1).lower() if m else "")


def parse_json_list(s: str, field_name: str) -> List[Dict[str, Any]]:
    s = (s or "").strip()
    if not s:
        return []
    try:
        v = json.loads(s)
        if isinstance(v, list):
            return [it for it in v if isinstance(it, dict)]
        return []
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid JSON for {field_name}")


def parse_skills(skills: str) -> List[str]:
    s = (skills or "").strip()
    if not s:
        return []
    try:
        v = json.loads(s)
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()][:8]
    except Exception:
        pass
    parts = [p.strip() for p in re.split(r"[,\n;]+", s) if p.strip()]
    return parts[:8]


# ---------------------------
# Supabase helpers
# ---------------------------
def supabase_client():
    require_env("SUPABASE_URL", SUPABASE_URL)
    require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    if create_client is None:
        raise HTTPException(status_code=500, detail="supabase client not installed. pip install supabase")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def upload_to_supabase_storage(
    bucket: str,
    path: str,
    content: bytes,
    content_type: str,
) -> Tuple[str, Optional[str]]:
    sb = supabase_client()

    try:
        sb.storage.from_(bucket).upload(
            path,
            content,
            file_options={"content-type": content_type or "application/octet-stream", "upsert": "true"},
        )
    except Exception as e:
        # retry remove then upload
        try:
            sb.storage.from_(bucket).remove([path])
            sb.storage.from_(bucket).upload(
                path,
                content,
                file_options={"content-type": content_type or "application/octet-stream", "upsert": "true"},
            )
        except Exception:
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    public_url: Optional[str] = None
    try:
        pu = sb.storage.from_(bucket).get_public_url(path)
        if isinstance(pu, dict):
            public_url = pu.get("publicUrl") or pu.get("public_url")
        else:
            public_url = pu
    except Exception:
        public_url = None

    return path, public_url


def _get_res_data(res: Any) -> Any:
    try:
        return res.data
    except Exception:
        return getattr(res, "data", None)


def insert_supabase(table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    sb = supabase_client()
    try:
        res = sb.table(table).insert(payload).execute()
        data = _get_res_data(res) or []
        if not data:
            raise Exception("No data returned")
        return data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insert to {table} failed: {e}")


def insert_many_supabase(table: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    sb = supabase_client()
    try:
        sb.table(table).insert(rows).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insert many to {table} failed: {e}")


# ---------------------------
# Jobs feed helpers (Apps Script)
# ---------------------------
def _format_history(resp: httpx.Response) -> str:
    hist = getattr(resp, "history", []) or []
    if not hist:
        return ""
    parts = []
    for h in hist:
        try:
            loc = h.headers.get("location", "")
            parts.append(f"{h.status_code}:{loc}")
        except Exception:
            parts.append(str(getattr(h, "status_code", "")))
    return " -> ".join(parts)


# ✅ Shared HTTP client + Jobs cache (in-memory)
_JOBS_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}  # key -> (expire_ts, data)
_JOBS_LOCKS: Dict[str, asyncio.Lock] = {}


def _cache_key(lang: str, country: str, department: str, level: str) -> str:
    return f"{(lang or 'th').lower()}|{country}|{department}|{level}"


def _lock_for(key: str) -> asyncio.Lock:
    if key not in _JOBS_LOCKS:
        _JOBS_LOCKS[key] = asyncio.Lock()
    return _JOBS_LOCKS[key]


async def _fetch_jobs_feed_raw(
    client: httpx.AsyncClient,
    lang: str = "th",
    country: str = "",
    department: str = "",
    level: str = "",
) -> Dict[str, Any]:
    require_env("GOOGLE_JOBS_FEED_URL", GOOGLE_JOBS_FEED_URL)

    params: Dict[str, str] = {"lang": (lang or "th").lower()}
    if country:
        params["country"] = country
    if department:
        params["department"] = department
    if level:
        params["level"] = level

    try:
        r = await client.get(GOOGLE_JOBS_FEED_URL, params=params)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Jobs feed request error: {e}")

    if r.status_code != 200:
        hist = _format_history(r)
        raise HTTPException(
            status_code=502,
            detail=(
                f"Jobs feed HTTP {r.status_code}; "
                f"history=[{hist}]; final_url={str(r.url)}; body={r.text[:300]}"
            ),
        )

    try:
        data = r.json()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=f"Jobs feed non-JSON; final_url={str(r.url)}; body={r.text[:300]}",
        )

    rows = data.get("rows") or []
    if isinstance(rows, list):
        cleaned: List[Dict[str, Any]] = []
        for x in rows:
            if not isinstance(x, dict):
                continue
            if not str(x.get("job_id", "")).strip():
                continue
            cleaned.append(x)
        rows = cleaned
    else:
        rows = []

    data["rows"] = rows
    data["total"] = len(rows)
    return data


async def fetch_jobs_feed(
    lang: str = "th",
    country: str = "",
    department: str = "",
    level: str = "",
    q: str = "",  # ✅ รับไว้กัน TypeError (แต่ไม่ส่งให้ feed)
) -> Dict[str, Any]:
    """
    ✅ Cache wrapper: ลดการเรียก Apps Script ซ้ำๆ
    """
    key = _cache_key(lang, country, department, level)
    now = time.time()

    hit = _JOBS_CACHE.get(key)
    if hit and hit[0] > now:
        return hit[1]

    lock = _lock_for(key)
    async with lock:
        # double-check after acquiring lock
        hit2 = _JOBS_CACHE.get(key)
        if hit2 and hit2[0] > time.time():
            return hit2[1]

        client: httpx.AsyncClient = app.state.http  # type: ignore[attr-defined]
        data = await _fetch_jobs_feed_raw(
            client=client,
            lang=lang,
            country=country,
            department=department,
            level=level,
        )

        expire_ts = time.time() + max(5, JOBS_CACHE_TTL_SEC)
        _JOBS_CACHE[key] = (expire_ts, data)
        return data


async def fetch_job_by_id(job_id: str, lang: str = "th") -> Dict[str, Any]:
    data = await fetch_jobs_feed(lang=lang)
    for j in (data.get("rows") or []):
        if str(j.get("job_id", "")).strip() == job_id:
            return j
    raise HTTPException(status_code=404, detail="Job not found")


# ---------------------------
# App
# ---------------------------
app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,             # ใช้ list จาก env
    allow_origin_regex=r"^https://.*\.netlify\.app$",  # ✅ preview deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup() -> None:
    # ✅ Shared HTTP client (keep-alive) เร็วขึ้นมาก
    app.state.http = httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,  # Apps Script /exec -> googleusercontent 302
        headers={
            "User-Agent": "SHD-Careers-Backend/1.0",
            "Accept": "application/json,text/plain,*/*",
        },
    )

    logger.info("startup env=%s", APP_ENV)
    logger.info("GOOGLE_JOBS_FEED_URL=%s", "set" if GOOGLE_JOBS_FEED_URL else "missing")
    logger.info("CORS_ORIGINS=%s", CORS_ORIGINS)
    logger.info("JOBS_CACHE_TTL_SEC=%s", JOBS_CACHE_TTL_SEC)


@app.on_event("shutdown")
async def _shutdown() -> None:
    try:
        client: httpx.AsyncClient = app.state.http  # type: ignore[attr-defined]
        await client.aclose()
    except Exception:
        pass


# Health
@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "env": APP_ENV, "time": utc_now_iso()}


@app.get("/api/health")
def health_api() -> Dict[str, Any]:
    return {"ok": True, "env": APP_ENV, "time": utc_now_iso()}


# ✅ Debug endpoint: ดู feed ดิบ
@app.get("/debug/jobs-feed")
async def debug_jobs_feed(lang: str = "th") -> Dict[str, Any]:
    data = await fetch_jobs_feed(lang=lang)
    return {
        "ok": True,
        "env": APP_ENV,
        "feed_url_set": bool(GOOGLE_JOBS_FEED_URL),
        "version": data.get("version", ""),
        "total": data.get("total", 0),
        "sample": (data.get("rows") or [])[:3],
    }


# ✅ Debug cache
@app.get("/debug/jobs-cache")
def debug_jobs_cache() -> Dict[str, Any]:
    now = time.time()
    items = []
    for k, (exp, data) in _JOBS_CACHE.items():
        items.append(
            {
                "key": k,
                "expires_in_sec": max(0, int(exp - now)),
                "total": int((data.get("total") or 0)),
                "version": data.get("version", ""),
            }
        )
    return {"ok": True, "ttl_sec": JOBS_CACHE_TTL_SEC, "keys": items}


# Jobs endpoints
@app.get("/jobs")
async def list_jobs(
    lang: str = "th",
    q: str = "",
    country: str = "",
    department: str = "",
    level: str = "",
) -> Dict[str, Any]:
    """
    Returns:
      { ok:true, version:"...", rows:[...], total:n }
    """
    # ✅ อย่าส่ง q ให้ feed (feed ไม่รองรับ q)
    data = await fetch_jobs_feed(lang=lang, country=country, department=department, level=level)
    rows: List[Dict[str, Any]] = data.get("rows", []) or []

    # ✅ search ทำใน backend (เร็วพอสำหรับจำนวนงานหลักสิบ/ร้อย)
    qn = (q or "").strip().lower()
    if qn:
        def hay(x: Dict[str, Any]) -> str:
            return (
                f"{x.get('title','')} {x.get('department','')} {x.get('level','')} "
                f"{x.get('location','')} {x.get('country','')}"
            ).lower()
        rows = [x for x in rows if qn in hay(x)]

    return {"ok": True, "version": data.get("version", ""), "rows": rows, "total": len(rows)}


@app.get("/jobs/{job_id}")
async def job_detail(job_id: str, lang: str = "th") -> Dict[str, Any]:
    j = await fetch_job_by_id(job_id=job_id, lang=lang)
    return {"ok": True, "job": j}


# Apply endpoint -> Supabase
@app.post("/apply/{job_id}")
async def apply(
    job_id: str,

    # personal
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    address: str = Form(""),

    # other fields
    visa_required: str = Form(""),
    available_start_date: str = Form(""),
    website_url: str = Form(""),
    source_channel: str = Form(""),
    terms_accepted: str = Form("true"),

    # complex fields (JSON)
    skills: str = Form(""),
    education_json: str = Form("[]"),
    experience_json: str = Form("[]"),

    # files
    resume: UploadFile = File(...),
    transcript: Optional[UploadFile] = File(None),
    attachments: Optional[List[UploadFile]] = File(None),
) -> Dict[str, Any]:
    require_env("SUPABASE_URL", SUPABASE_URL)
    require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    require_env("SUPABASE_BUCKET", SUPABASE_BUCKET)

    # Lookup job to prevent tampering
    job = await fetch_job_by_id(job_id=job_id, lang="en")
    job_country = str(job.get("country", "")).strip()
    job_department = str(job.get("department", "")).strip()
    job_level = str(job.get("level", "")).strip()

    # Validate resume
    resume_name = safe_filename(resume.filename or "resume")
    resume_ext = get_ext(resume_name)
    if resume_ext and resume_ext not in ALLOWED_RESUME_EXT:
        raise HTTPException(status_code=400, detail="Resume must be PDF/DOC/DOCX")

    resume_bytes = await resume.read()
    if len(resume_bytes) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=400, detail="Resume must be <= 2MB")

    # Transcript optional
    transcript_bytes: Optional[bytes] = None
    transcript_name: Optional[str] = None
    if transcript is not None:
        transcript_name = safe_filename(transcript.filename or "transcript")
        t_ext = get_ext(transcript_name)
        if t_ext and t_ext not in ALLOWED_RESUME_EXT:
            raise HTTPException(status_code=400, detail="Transcript must be PDF/DOC/DOCX")
        transcript_bytes = await transcript.read()
        if len(transcript_bytes) > MAX_RESUME_BYTES:
            raise HTTPException(status_code=400, detail="Transcript must be <= 2MB")

    # Attachments optional
    attach_list = attachments or []
    attach_payloads: List[Tuple[str, str, bytes]] = []
    total_attach = 0
    for a in attach_list:
        name = safe_filename(a.filename or "file")
        ext = get_ext(name)
        if ext and ext not in ALLOWED_ATTACH_EXT:
            raise HTTPException(status_code=400, detail=f"Attachment type not allowed: {ext}")
        b = await a.read()
        total_attach += len(b)
        if total_attach > MAX_ATTACH_TOTAL_BYTES:
            raise HTTPException(status_code=400, detail="Attachments total must be <= 50MB")
        attach_payloads.append((name, a.content_type or "application/octet-stream", b))

    educations = parse_json_list(education_json, "education_json")[:5]
    experiences = parse_json_list(experience_json, "experience_json")[:20]
    skill_list = parse_skills(skills)

    visa_bool = str(visa_required).strip().lower() in ("1", "true", "yes", "y", "ต้องการ", "need")
    terms_bool = str(terms_accepted).strip().lower() in ("1", "true", "yes", "y")

    # create application
    app_row = insert_supabase(
        "applications",
        {
            "job_id": job_id,
            "country": job_country,
            "department": job_department,
            "level": job_level,
            "first_name": first_name.strip(),
            "last_name": last_name.strip(),
            "email": email.strip(),
            "phone": phone.strip(),
            "address": (address or "").strip(),
            "visa_required": visa_bool,
            "available_start_date": (available_start_date or None),
            "website_url": (website_url or "").strip(),
            "source_channel": (source_channel or "").strip(),
            "terms_accepted": terms_bool,
            "resume_url": None,
            "transcript_url": None,
        },
    )
    application_id = str(app_row.get("id"))

    base_path = f"applications/{application_id}"

    # upload resume
    resume_path = f"{base_path}/resume_{resume_name}"
    resume_storage_path, resume_public_url = await upload_to_supabase_storage(
        SUPABASE_BUCKET, resume_path, resume_bytes, resume.content_type or "application/octet-stream"
    )

    transcript_public_url: Optional[str] = None
    transcript_storage_path: Optional[str] = None
    if transcript_bytes is not None and transcript_name is not None:
        transcript_path = f"{base_path}/transcript_{transcript_name}"
        transcript_storage_path, transcript_public_url = await upload_to_supabase_storage(
            SUPABASE_BUCKET, transcript_path, transcript_bytes, transcript.content_type or "application/octet-stream"
        )

    # update application urls
    try:
        sb = supabase_client()
        sb.table("applications").update(
            {
                "resume_url": resume_public_url or f"storage:{resume_storage_path}",
                "transcript_url": (
                    transcript_public_url
                    or (f"storage:{transcript_storage_path}" if transcript_storage_path else None)
                ),
            }
        ).eq("id", application_id).execute()
    except Exception as e:
        logger.warning("update applications file url failed: %s", e)

    # educations
    edu_rows: List[Dict[str, Any]] = []
    for e in educations:
        edu_rows.append(
            {
                "application_id": application_id,
                "degree_level": (e.get("degree_level") or e.get("level") or "").strip(),
                "institute": (e.get("institute") or e.get("school") or "").strip(),
                "program": (e.get("program") or e.get("major") or "").strip(),
                "start_month": (e.get("start_month") or e.get("start") or "").strip(),
                "end_month": (e.get("end_month") or e.get("end") or "").strip(),
                "degree_type": (e.get("degree_type") or "").strip(),
                "gpa": (e.get("gpa") or "").strip(),
            }
        )
    insert_many_supabase("application_educations", edu_rows)

    # experiences
    exp_rows: List[Dict[str, Any]] = []
    for ex in experiences:
        exp_rows.append(
            {
                "application_id": application_id,
                "company": (ex.get("company") or "").strip(),
                "role": (ex.get("role") or ex.get("title") or "").strip(),
                "start_month": (ex.get("start_month") or ex.get("start") or "").strip(),
                "end_month": (ex.get("end_month") or ex.get("end") or "").strip(),
            }
        )
    insert_many_supabase("application_experiences", exp_rows)

    # skills
    insert_many_supabase("application_skills", [{"application_id": application_id, "skill": s} for s in skill_list])

    # attachments
    att_rows: List[Dict[str, Any]] = []
    for (name, ct, b) in attach_payloads:
        att_path = f"{base_path}/att_{name}"
        storage_path, public_url = await upload_to_supabase_storage(SUPABASE_BUCKET, att_path, b, ct)
        att_rows.append(
            {
                "application_id": application_id,
                "file_name": name,
                "file_url": public_url or f"storage:{storage_path}",
            }
        )
    insert_many_supabase("application_attachments", att_rows)

    return {"ok": True, "application_id": application_id}
