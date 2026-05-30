"""
Transcription provider interface + AssemblyAI implementation.

To swap providers: subclass TranscriptionProvider, implement transcribe(),
then update get_transcription_provider().
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


@dataclass
class Transcript:
    full_text: str
    segments: list[TranscriptSegment] = field(default_factory=list)


class TranscriptionProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_path: Path) -> Transcript:
        ...


class AssemblyAIProvider(TranscriptionProvider):
    def __init__(self, api_key: str):
        import assemblyai as aai  # type: ignore
        aai.settings.api_key = api_key
        self._aai = aai

    async def transcribe(self, audio_path: Path) -> Transcript:
        loop = asyncio.get_running_loop()

        def _call() -> object:
            transcriber = self._aai.Transcriber()
            # "universal-3-pro" is AssemblyAI's current best model name (SDK v0.64+)
            config = self._aai.TranscriptionConfig(
                speech_models=["universal-3-pro"],
                punctuate=True,
                format_text=True,
            )
            return transcriber.transcribe(str(audio_path), config=config)

        result = await loop.run_in_executor(None, _call)

        if result.status == self._aai.TranscriptStatus.error:
            err = result.error or ""
            # AssemblyAI returns this when the file has no spoken audio
            if "no spoken audio" in err.lower() or "language_detection" in err.lower():
                raise ValueError(
                    "NO_AUDIO: This file has no audio. "
                    "Please try uploading a file that contains speech or audio."
                )
            raise RuntimeError(f"Transcription failed: {err}")

        full_text: str = result.text or ""

        segments: list[TranscriptSegment] = []
        if result.utterances:
            for utt in result.utterances:
                segments.append(
                    TranscriptSegment(
                        start=utt.start / 1000.0,   # ms → seconds
                        end=utt.end / 1000.0,
                        text=utt.text,
                    )
                )
        elif result.words:
            # Build rough segments from word-level timestamps (fallback)
            chunk, chunk_start = [], None
            for w in result.words:
                if chunk_start is None:
                    chunk_start = w.start / 1000.0
                chunk.append(w.text)
                if w.text.endswith((".", "?", "!")):
                    segments.append(
                        TranscriptSegment(
                            start=chunk_start,
                            end=w.end / 1000.0,
                            text=" ".join(chunk),
                        )
                    )
                    chunk, chunk_start = [], None
            if chunk and chunk_start is not None:
                segments.append(
                    TranscriptSegment(
                        start=chunk_start,
                        end=result.words[-1].end / 1000.0,
                        text=" ".join(chunk),
                    )
                )

        return Transcript(full_text=full_text, segments=segments)


def get_transcription_provider(api_key: str) -> TranscriptionProvider:
    return AssemblyAIProvider(api_key)
