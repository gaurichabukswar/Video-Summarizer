"use client";

import { useCallback, useRef, useState } from "react";
import { Link2, Upload, ArrowRight, AlertCircle, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitFile, submitUrl } from "@/lib/api";

interface Props {
  onJobCreated: (jobId: string) => void;
}

type Tab = "url" | "file";

const MAX_MB = 500;
const ACCEPTED = ".mp4,.avi,.mov,.mkv,.webm,.m4v,.flv,.wmv,.mpeg,.mpg";

const DEMO_VIDEOS = [
  { label: "ProductCon keynote (21 min)", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { label: "Team sync recording", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
];

export function VideoInput({ onJobCreated }: Props) {
  const [tab, setTab] = useState<Tab>("url");
  const [urlValue, setUrlValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearError = () => setError(null);

  const handleUrlSubmit = async (url: string) => {
    if (!url.trim()) return;
    clearError();
    setLoading(true);
    try {
      const { job_id } = await submitUrl(url.trim());
      onJobCreated(job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  const handleFileSubmit = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large — maximum is ${MAX_MB} MB.`);
      return;
    }
    clearError();
    setSelectedFile(file);
    setLoading(true);
    try {
      const { job_id } = await submitFile(file);
      onJobCreated(job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSubmit(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* ── Main card ──────────────────────────────────────────────── */}
      <div className="neo-card p-2">
        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-2">
          <button
            onClick={() => { setTab("url"); clearError(); }}
            className={cn(
              "tab-btn",
              tab === "url"
                ? "bg-ink text-white"
                : "text-ink/60 hover:text-ink hover:bg-cream"
            )}
          >
            <Link2 size={14} />
            Paste link
          </button>
          <button
            onClick={() => { setTab("file"); clearError(); }}
            className={cn(
              "tab-btn",
              tab === "file"
                ? "bg-ink text-white"
                : "text-ink/60 hover:text-ink hover:bg-cream"
            )}
          >
            <Upload size={14} />
            Upload file
          </button>
        </div>

        {/* URL input row */}
        {tab === "url" && (
          <div className="flex flex-col sm:flex-row gap-2 p-1">
            <div className="relative flex-1">
              <Link2
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none"
              />
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit(urlValue)}
                placeholder="YouTube, Google Drive, or a direct video URL..."
                disabled={loading}
                className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-ink/15 bg-cream/60
                           text-sm text-ink placeholder:text-ink/35
                           focus:outline-none focus:border-ink/40
                           disabled:opacity-50 transition-colors"
              />
            </div>
            <button
              onClick={() => handleUrlSubmit(urlValue)}
              disabled={loading || !urlValue.trim()}
              className="btn-coral flex items-center justify-center gap-2 sm:w-auto w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                <>
                  Summarize
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {/* File upload */}
        {tab === "file" && (
          <div className="p-1 space-y-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && fileRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all",
                dragging
                  ? "border-coral bg-coral/5"
                  : "border-ink/20 bg-cream/40 hover:border-coral/50 hover:bg-coral/5",
                loading && "pointer-events-none opacity-60"
              )}
            >
              <Film size={36} className="text-ink/25" />
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">{selectedFile.name}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">
                    Drop a video or{" "}
                    <span className="text-coral underline decoration-dotted">browse</span>
                  </p>
                  <p className="text-xs text-ink/40 mt-1">
                    MP4 · MOV · MKV · WebM · AVI · up to {MAX_MB} MB
                  </p>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                  <div className="w-6 h-6 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSubmit(f);
                }}
              />
            </div>
            {selectedFile && !loading && (
              <button
                onClick={() => {
                  if (selectedFile) handleFileSubmit(selectedFile);
                }}
                className="btn-coral w-full flex items-center justify-center gap-2"
              >
                Summarize <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-up">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Demo section */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-ink/40 italic tracking-wide">Try a demo</p>
        <div className="flex flex-wrap justify-center gap-2">
          {DEMO_VIDEOS.map((d) => (
            <button
              key={d.label}
              onClick={() => {
                setTab("url");
                setUrlValue(d.url);
                handleUrlSubmit(d.url);
              }}
              disabled={loading}
              className="demo-pill"
            >
              <span className="text-coral text-xs">▶</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
