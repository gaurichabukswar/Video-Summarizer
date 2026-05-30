"""
Summarization provider interface.
Implementations: DeepSeek (default), Anthropic, OpenAI, Gemini.

DeepSeek uses the OpenAI-compatible API — no extra SDK needed beyond `openai`.
"""

import asyncio
import json
from abc import ABC, abstractmethod
from typing import Optional

from models import KeyMoment, SummaryResult

_SYSTEM_PROMPT = """You are an expert video content analyst. Analyze the provided transcript \
and produce an accurate, concise summary.

STRICT RULES:
- Stay faithful to the transcript. Never invent or add information not present in it.
- If the transcript is unclear or incomplete, say so in the summary.
- Do not include personal opinions or knowledge from outside the transcript.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:
{
  "summary": "<3–5 sentence overall summary>",
  "key_points": ["<point>", ...],
  "key_moments": [{"timestamp": "MM:SS", "description": "<what happens>"}] or null,
  "action_items": ["<action>", ...] or null
}

- key_moments: include only when the transcript contains meaningful timestamps; otherwise null.
- action_items: include only when the video is a meeting, tutorial, or walkthrough with clear tasks; otherwise null.
"""


class SummarizationProvider(ABC):
    @abstractmethod
    async def summarize(
        self, transcript_text: str, segments_info: Optional[str] = None
    ) -> SummaryResult:
        ...


class DeepSeekProvider(SummarizationProvider):
    """DeepSeek via its OpenAI-compatible chat API."""

    def __init__(self, api_key: str):
        from openai import OpenAI  # type: ignore

        self._client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com",
        )

    async def summarize(
        self, transcript_text: str, segments_info: Optional[str] = None
    ) -> SummaryResult:
        user_content = _build_user_message(transcript_text, segments_info)
        loop = asyncio.get_running_loop()

        def _call() -> str:
            resp = self._client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=2048,
                temperature=0.3,
            )
            return resp.choices[0].message.content or ""

        raw = await loop.run_in_executor(None, _call)
        return _parse_llm_output(raw, transcript_text)


class AnthropicProvider(SummarizationProvider):
    def __init__(self, api_key: str):
        import anthropic  # type: ignore
        self._client = anthropic.Anthropic(api_key=api_key)

    async def summarize(
        self, transcript_text: str, segments_info: Optional[str] = None
    ) -> SummaryResult:
        user_content = _build_user_message(transcript_text, segments_info)
        loop = asyncio.get_running_loop()

        def _call() -> str:
            resp = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
            return resp.content[0].text

        raw = await loop.run_in_executor(None, _call)
        return _parse_llm_output(raw, transcript_text)


class OpenAIProvider(SummarizationProvider):
    def __init__(self, api_key: str):
        from openai import OpenAI  # type: ignore
        self._client = OpenAI(api_key=api_key)

    async def summarize(
        self, transcript_text: str, segments_info: Optional[str] = None
    ) -> SummaryResult:
        user_content = _build_user_message(transcript_text, segments_info)
        loop = asyncio.get_running_loop()

        def _call() -> str:
            resp = self._client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content or ""

        raw = await loop.run_in_executor(None, _call)
        return _parse_llm_output(raw, transcript_text)


class GeminiProvider(SummarizationProvider):
    def __init__(self, api_key: str):
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel("gemini-1.5-pro")

    async def summarize(
        self, transcript_text: str, segments_info: Optional[str] = None
    ) -> SummaryResult:
        prompt = _SYSTEM_PROMPT + "\n\n" + _build_user_message(transcript_text, segments_info)
        loop = asyncio.get_running_loop()

        def _call() -> str:
            return self._model.generate_content(prompt).text

        raw = await loop.run_in_executor(None, _call)
        return _parse_llm_output(raw, transcript_text)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_message(transcript_text: str, segments_info: Optional[str]) -> str:
    msg = f"Please summarize the following video transcript:\n\n{transcript_text}"
    if segments_info:
        msg += f"\n\nTimestamp context (first segments):\n{segments_info}"
    return msg


def _parse_llm_output(raw: str, transcript_text: str) -> SummaryResult:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:])
    if text.endswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[:-1])
    text = text.strip()

    try:
        data = json.loads(text)
        key_moments: Optional[list[KeyMoment]] = None
        if data.get("key_moments"):
            key_moments = [KeyMoment(**m) for m in data["key_moments"]]
        return SummaryResult(
            summary=data["summary"],
            key_points=data.get("key_points") or [],
            key_moments=key_moments,
            action_items=data.get("action_items") or None,
            transcript=transcript_text,
        )
    except (json.JSONDecodeError, KeyError, TypeError):
        return SummaryResult(
            summary=text[:1000],
            key_points=[],
            transcript=transcript_text,
        )


def get_summarization_provider(
    provider: str,
    deepseek_api_key: str = "",
    anthropic_api_key: str = "",
    openai_api_key: str = "",
    gemini_api_key: str = "",
) -> SummarizationProvider:
    if provider == "deepseek":
        return DeepSeekProvider(deepseek_api_key)
    if provider == "anthropic":
        return AnthropicProvider(anthropic_api_key)
    if provider == "openai":
        return OpenAIProvider(openai_api_key)
    if provider == "gemini":
        return GeminiProvider(gemini_api_key)
    raise ValueError(f"Unknown LLM provider: {provider!r}. Choose deepseek, anthropic, openai, or gemini.")
