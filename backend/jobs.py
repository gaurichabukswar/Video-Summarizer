import uuid
from typing import Optional
from models import JobStatus, JobStage, SummaryResult


class Job:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status = JobStatus.queued
        self.stage: Optional[JobStage] = None
        self.progress: Optional[float] = None
        self.result: Optional[SummaryResult] = None
        self.error: Optional[str] = None


class JobStore:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create(self) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(job_id)
        self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def update_stage(self, job_id: str, stage: JobStage, progress: float = 0.0) -> None:
        job = self._jobs[job_id]
        job.status = JobStatus.processing
        job.stage = stage
        job.progress = progress

    def complete(self, job_id: str, result: SummaryResult) -> None:
        job = self._jobs[job_id]
        job.status = JobStatus.done
        job.stage = None
        job.progress = 1.0
        job.result = result

    def fail(self, job_id: str, error: str) -> None:
        job = self._jobs[job_id]
        job.status = JobStatus.failed
        job.error = error


job_store = JobStore()
