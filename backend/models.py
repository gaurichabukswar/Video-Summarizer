from pydantic import BaseModel
from typing import Optional
from enum import Enum


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class JobStage(str, Enum):
    fetching = "fetching"
    extracting = "extracting"
    transcribing = "transcribing"
    summarizing = "summarizing"


class KeyMoment(BaseModel):
    timestamp: str
    description: str


class SummaryResult(BaseModel):
    summary: str
    key_points: list[str]
    key_moments: Optional[list[KeyMoment]] = None
    action_items: Optional[list[str]] = None
    transcript: str


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    stage: Optional[JobStage] = None
    progress: Optional[float] = None
    result: Optional[SummaryResult] = None
    error: Optional[str] = None
