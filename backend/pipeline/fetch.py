"""
Fetches video content from various sources:
- YouTube and other yt-dlp-supported sites
- Google Drive (with large-file confirmation token handling)
- Direct video URLs
- Already-saved uploaded files
"""

import asyncio
import re
from pathlib import Path
from typing import Optional

import aiohttp
import yt_dlp

GDRIVE_PATTERN = re.compile(
    r"https://drive\.google\.com/(?:file/d/|uc\?.*id=|open\?id=)([^/&?#]+)"
)
YTDLP_DOMAINS = [
    "youtube.com", "youtu.be", "vimeo.com", "dailymotion.com",
    "twitch.tv", "tiktok.com", "twitter.com", "x.com",
    "instagram.com", "facebook.com", "reddit.com",
]


async def fetch_video(url: str, dest_dir: Path) -> Path:
    """Download video from URL, return local path."""
    gdrive_id = _extract_gdrive_id(url)
    if gdrive_id:
        return await _fetch_gdrive(gdrive_id, dest_dir)

    if _looks_like_ytdlp_site(url):
        return await _fetch_yt_dlp(url, dest_dir)

    # Try yt-dlp first (handles many generic sites), fall back to direct HTTP
    try:
        return await _fetch_yt_dlp(url, dest_dir)
    except Exception:
        return await _fetch_direct(url, dest_dir)


async def save_upload(file_data: bytes, filename: str, dest_dir: Path) -> Path:
    """Write an uploaded file to dest_dir and return its path."""
    safe_name = Path(filename).name  # strip any path components
    dest_path = dest_dir / safe_name
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, dest_path.write_bytes, file_data)
    return dest_path


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_gdrive_id(url: str) -> Optional[str]:
    m = GDRIVE_PATTERN.search(url)
    return m.group(1) if m else None


def _looks_like_ytdlp_site(url: str) -> bool:
    return any(d in url for d in YTDLP_DOMAINS)


async def _fetch_yt_dlp(url: str, dest_dir: Path) -> Path:
    output_template = str(dest_dir / "%(id)s.%(ext)s")
    ydl_opts = {
        "outtmpl": output_template,
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "quiet": True,
        "no_warnings": True,
        "merge_output_format": "mp4",
    }

    loop = asyncio.get_running_loop()

    def _download() -> Path:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            # prepare_filename gives the final merged path
            filename = ydl.prepare_filename(info)
            # yt-dlp may append .mp4 after merging
            p = Path(filename)
            if not p.exists():
                p = p.with_suffix(".mp4")
            if not p.exists():
                # scan dest_dir for anything matching the video id
                vid_id = info.get("id", "")
                candidates = list(dest_dir.glob(f"{vid_id}.*"))
                if candidates:
                    p = candidates[0]
                else:
                    raise FileNotFoundError(f"yt-dlp download not found: {filename}")
            return p

    return await loop.run_in_executor(None, _download)


async def _fetch_gdrive(file_id: str, dest_dir: Path) -> Path:
    """Download from Google Drive with large-file confirmation support."""
    dest_path = dest_dir / f"{file_id}.mp4"

    async with aiohttp.ClientSession() as session:
        base_url = f"https://drive.google.com/uc?export=download&id={file_id}"

        async with session.get(base_url) as resp:
            if resp.status == 403:
                raise ValueError(
                    "Google Drive file is not publicly accessible. "
                    "Share it with 'Anyone with the link' and try again."
                )
            if resp.status != 200:
                raise ValueError(f"Google Drive returned HTTP {resp.status}.")

            content_type = resp.headers.get("content-type", "")

            if "text/html" in content_type:
                # Large file — Google shows a warning page; extract confirm token
                html = await resp.text()
                token = _extract_gdrive_confirm_token(html)
                confirm_url = (
                    f"https://drive.google.com/uc?export=download&confirm={token}&id={file_id}"
                    if token
                    else f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"
                )
                async with session.get(confirm_url) as cr:
                    if cr.status != 200:
                        raise ValueError(
                            "Could not download Google Drive file. "
                            "Ensure the file is publicly shared."
                        )
                    await _stream_to_file(cr, dest_path)
            else:
                await _stream_to_file(resp, dest_path)

    return dest_path


def _extract_gdrive_confirm_token(html: str) -> Optional[str]:
    m = re.search(r'confirm=([0-9A-Za-z_\-]+)', html)
    return m.group(1) if m else None


async def _fetch_direct(url: str, dest_dir: Path) -> Path:
    """Stream a direct video URL to disk."""
    raw_name = url.split("?")[0].rstrip("/").split("/")[-1] or "video.mp4"
    dest_path = dest_dir / raw_name

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise ValueError(f"Failed to download video: HTTP {resp.status}")
            await _stream_to_file(resp, dest_path)

    return dest_path


async def _stream_to_file(resp: aiohttp.ClientResponse, dest: Path) -> None:
    with open(dest, "wb") as f:
        async for chunk in resp.content.iter_chunked(65_536):
            f.write(chunk)
