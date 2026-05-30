"""
Extracts a compressed mono audio track from a video file using ffmpeg.
Outputs 16 kHz mono MP3 — the minimum quality Deepgram needs; keeps files small.
"""

import asyncio
import subprocess
from pathlib import Path


async def extract_audio(video_path: Path, dest_dir: Path) -> Path:
    """Extract audio from *video_path* and return path to the MP3."""
    audio_path = dest_dir / f"{video_path.stem}_audio.mp3"

    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vn",              # drop video stream
        "-acodec", "mp3",
        "-ar", "16000",     # 16 kHz sample rate
        "-ac", "1",         # mono
        "-ab", "64k",       # 64 kbps — good enough for speech
        "-y",               # overwrite without asking
        str(audio_path),
    ]

    loop = asyncio.get_running_loop()

    def _run() -> Path:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise RuntimeError(
                f"ffmpeg audio extraction failed:\n{result.stderr[-2000:]}"
            )
        return audio_path

    return await loop.run_in_executor(None, _run)
