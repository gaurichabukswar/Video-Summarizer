"""
FastAPI entry point.

POST /jobs  — accepts multipart (file) OR form/JSON (url), returns 202 + job_id
GET  /jobs/{job_id} — returns current status, stage, progress, and final result
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from jobs import job_store
from models import JobResponse
from pipeline.runner import run_pipeline

app = FastAPI(title="Video Summarizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v", ".flv", ".wmv", ".mpeg", ".mpg"}
MAX_BYTES = settings.max_file_size_mb * 1024 * 1024


@app.on_event("startup")
async def _startup() -> None:
    Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)


@app.post("/jobs", status_code=202)
async def create_job(request: Request, background_tasks: BackgroundTasks) -> dict:
    """
    Accepts two content types:
      - multipart/form-data  with field `file`  (video upload)
      - multipart/form-data  with field `url`   (video URL)
      - application/json     with key  `url`    (video URL)
    """
    content_type = request.headers.get("content-type", "")

    file_data: Optional[bytes] = None
    filename: Optional[str] = None
    url: Optional[str] = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        raw_file: Optional[UploadFile] = form.get("file")  # type: ignore[assignment]
        raw_url = form.get("url")

        if raw_file and hasattr(raw_file, "filename"):
            ext = Path(raw_file.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    400,
                    f"Unsupported file type '{ext}'. "
                    f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
                )
            contents = await raw_file.read()
            if len(contents) > MAX_BYTES:
                raise HTTPException(
                    400, f"File exceeds maximum size of {settings.max_file_size_mb} MB."
                )
            file_data = contents
            filename = raw_file.filename
        elif raw_url:
            url = str(raw_url).strip()
        else:
            raise HTTPException(400, "Provide either a 'file' field or a 'url' field.")

    elif "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(400, "Invalid JSON body.")
        url = (body.get("url") or "").strip() or None
        if not url:
            raise HTTPException(400, "JSON body must contain a non-empty 'url' key.")
    else:
        raise HTTPException(
            415,
            "Content-Type must be multipart/form-data or application/json.",
        )

    if url and not url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")

    job = job_store.create()
    background_tasks.add_task(
        run_pipeline,
        job.job_id,
        url=url,
        file_data=file_data,
        filename=filename,
    )
    return {"job_id": job.job_id, "status": "queued"}


@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return JobResponse(
        job_id=job.job_id,
        status=job.status,
        stage=job.stage,
        progress=job.progress,
        result=job.result,
        error=job.error,
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
