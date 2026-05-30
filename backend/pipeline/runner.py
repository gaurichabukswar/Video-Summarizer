"""
Orchestrates the full pipeline: fetch → extract → transcribe → summarize.
Runs as a FastAPI BackgroundTask; keeps all blocking work off the event loop.
"""

import shutil
from pathlib import Path

from config import settings
from jobs import job_store
from models import JobStage
from pipeline.audio import extract_audio
from pipeline.fetch import fetch_video, save_upload
from pipeline.summarize import get_summarization_provider
from pipeline.transcribe import get_transcription_provider


async def run_pipeline(
    job_id: str,
    *,
    url: str | None = None,
    file_data: bytes | None = None,
    filename: str | None = None,
) -> None:
    work_dir = Path(settings.temp_dir) / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # ── Stage 1: FETCH ────────────────────────────────────────────────
        job_store.update_stage(job_id, JobStage.fetching, 0.0)
        if url:
            video_path = await fetch_video(url, work_dir)
        elif file_data and filename:
            video_path = await save_upload(file_data, filename, work_dir)
        else:
            raise ValueError("No input provided to pipeline.")
        job_store.update_stage(job_id, JobStage.fetching, 1.0)

        # ── Stage 2: EXTRACT ──────────────────────────────────────────────
        job_store.update_stage(job_id, JobStage.extracting, 0.0)
        audio_path = await extract_audio(video_path, work_dir)
        job_store.update_stage(job_id, JobStage.extracting, 1.0)

        # ── Stage 3: TRANSCRIBE ───────────────────────────────────────────
        job_store.update_stage(job_id, JobStage.transcribing, 0.0)
        transcriber = get_transcription_provider(settings.assembly_ai_api_key)
        transcript = await transcriber.transcribe(audio_path)
        job_store.update_stage(job_id, JobStage.transcribing, 1.0)

        if not transcript.full_text.strip():
            raise ValueError(
                "NO_AUDIO: This file has no audio. "
                "Please try uploading a file that contains speech or audio."
            )

        # ── Stage 4: SUMMARIZE ────────────────────────────────────────────
        job_store.update_stage(job_id, JobStage.summarizing, 0.0)
        summarizer = get_summarization_provider(
            settings.llm_provider,
            deepseek_api_key=settings.deepseek_api_key,
            anthropic_api_key=settings.anthropic_api_key,
            openai_api_key=settings.openai_api_key,
            gemini_api_key=settings.gemini_api_key,
        )

        segments_info: str | None = None
        if transcript.segments:
            lines = []
            for seg in transcript.segments[:60]:
                mm = int(seg.start // 60)
                ss = int(seg.start % 60)
                lines.append(f"[{mm:02d}:{ss:02d}] {seg.text}")
            segments_info = "\n".join(lines)

        result = await summarizer.summarize(transcript.full_text, segments_info)
        job_store.update_stage(job_id, JobStage.summarizing, 1.0)

        job_store.complete(job_id, result)

    except Exception as exc:
        job_store.fail(job_id, str(exc))

    finally:
        # Always remove temp files whether the job succeeded or failed
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
