<div align="center">
  <img src="frontend/public/favicon-192.png" width="80" height="80" alt="Video Summarizer" />
  <h1>Video Summarizer</h1>
  <p><strong>Turn any video into a clear, readable summary.</strong></p>
  <p>Paste a YouTube or Google Drive link, or upload a file. We generate a full transcript from the audio — no captions required.</p>

  ![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
  ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
  ![License](https://img.shields.io/badge/license-MIT-green)
</div>

---

## 🎬 Demo

<video src="assets/demo.mov" controls width="100%" style="border-radius:12px;max-width:900px;"></video>

> *Paste a YouTube link → watch the pipeline run in real time → get a structured summary with key points and timestamps.*

---

## ✨ Features

- **No captions needed** — always transcribes directly from audio
- **YouTube, Google Drive & direct URLs** — powered by yt-dlp
- **File upload** — MP4, MOV, MKV, WebM, AVI and more (up to 500 MB)
- **Live progress** — four-stage pipeline with per-stage status (Fetching → Extracting → Transcribing → Summarizing)
- **Structured output** — summary, key points, timestamped moments, action items
- **Full transcript** — collapsible with one-click copy
- **Swap providers** — transcription and LLM sit behind clean interfaces; change one env var

---

## 🏗️ Architecture

```
Submit video (URL or file)
        │
        ▼
  POST /jobs  →  202 { job_id }
        │
        ▼  (background task)
  ┌─────────────────────────────────┐
  │  1. FETCH     download video    │
  │  2. EXTRACT   ffmpeg → MP3      │
  │  3. TRANSCRIBE  AssemblyAI STT  │
  │  4. SUMMARIZE   DeepSeek LLM    │
  └─────────────────────────────────┘
        │
        ▼
  GET /jobs/{id}  ←  client polls every 2 s
```

**Stack**

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · React 19 · TypeScript · Tailwind CSS · TanStack Query |
| Backend | FastAPI · Python 3.12+ · Uvicorn |
| Speech-to-text | AssemblyAI (Universal-3-Pro) |
| Summarization | DeepSeek (`deepseek-chat`) — swappable with Anthropic / OpenAI / Gemini |
| Video fetching | yt-dlp |
| Audio extraction | ffmpeg |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Install |
|---|---|
| Python 3.12+ | [python.org](https://python.org) |
| Node 18+ | [nodejs.org](https://nodejs.org) |
| ffmpeg | `brew install ffmpeg` · `sudo apt install ffmpeg` |

### 1. Clone

```bash
git clone https://github.com/gaurichabukswar/Video-Summarizer.git
cd Video-Summarizer
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in your API keys
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local # already points to localhost:8000
```

### 4. Run

Open **two terminals**:

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `ASSEMBLY_AI_API_KEY` | ✅ | AssemblyAI key → [console.assemblyai.com](https://www.assemblyai.com/dashboard) |
| `DEEPSEEK_API_KEY` | ✅ (default) | DeepSeek key → [platform.deepseek.com](https://platform.deepseek.com) |
| `LLM_PROVIDER` | ✅ | `deepseek` · `anthropic` · `openai` · `gemini` |
| `ANTHROPIC_API_KEY` | if provider=anthropic | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | if provider=openai | [platform.openai.com](https://platform.openai.com) |
| `GEMINI_API_KEY` | if provider=gemini | [aistudio.google.com](https://aistudio.google.com) |
| `MAX_FILE_SIZE_MB` | | Default: `500` |
| `TEMP_DIR` | | Default: `/tmp/video_summarizer` |
| `CORS_ORIGINS` | | Default: `http://localhost:3000` |

### `frontend/.env.local`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

---

## 📡 API Reference

### `POST /jobs`

Accepts a video via:
- **Multipart form** — `file` field (binary upload)
- **Multipart form** — `url` field (string)
- **JSON** — `{ "url": "https://..." }`

**Response `202`**
```json
{ "job_id": "uuid", "status": "queued" }
```

### `GET /jobs/{job_id}`

```json
{
  "job_id": "uuid",
  "status": "queued | processing | done | failed",
  "stage":  "fetching | extracting | transcribing | summarizing | null",
  "progress": 0.75,
  "result": {
    "summary": "...",
    "key_points": ["..."],
    "key_moments": [{ "timestamp": "02:14", "description": "..." }],
    "action_items": ["..."],
    "transcript": "..."
  },
  "error": null
}
```

### `GET /health`
```json
{ "status": "ok" }
```

---

## 🔌 Swapping Providers

**Transcription** — subclass `TranscriptionProvider` in `backend/pipeline/transcribe.py`, implement `transcribe()`, update `get_transcription_provider()`.

**LLM** — subclass `SummarizationProvider` in `backend/pipeline/summarize.py`, implement `summarize()`, update `get_summarization_provider()`. Then set `LLM_PROVIDER` in `.env`.

No pipeline code changes needed.

---

## 📁 Project Structure

```
Video-Summarizer/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── models.py            # Pydantic schemas
│   ├── jobs.py              # In-memory job store
│   ├── config.py            # Settings from .env
│   ├── requirements.txt
│   ├── .env.example
│   └── pipeline/
│       ├── fetch.py         # yt-dlp, Google Drive, direct HTTP
│       ├── audio.py         # ffmpeg audio extraction
│       ├── transcribe.py    # TranscriptionProvider + AssemblyAI
│       ├── summarize.py     # SummarizationProvider + DeepSeek/Anthropic/OpenAI/Gemini
│       └── runner.py        # Pipeline orchestrator
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── providers.tsx
    │   └── globals.css
    ├── components/
    │   ├── LogoMark.tsx
    │   ├── VideoInput.tsx
    │   ├── JobProgress.tsx
    │   └── SummaryResults.tsx
    ├── lib/
    │   ├── api.ts
    │   └── utils.ts
    └── public/              # Favicons (SVG + PNG all sizes)
```

---

## ⚠️ Limitations (v1)

- **In-memory job store** — jobs are lost on server restart
- **Single worker** — BackgroundTasks runs in-process; use Celery + Redis for production concurrency
- **Google Drive** — file must be publicly shared ("Anyone with the link")

---

## 📄 License

MIT © 2026 Gauri Chabukswar
