"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobState, JobStage } from "@/lib/api";

interface Props {
  job: JobState;
}

const STAGES: { id: JobStage; label: string; detail: string }[] = [
  { id: "fetching",      label: "Fetching",     detail: "Downloading the video" },
  { id: "extracting",   label: "Extracting",   detail: "Pulling the audio track" },
  { id: "transcribing", label: "Transcribing", detail: "Converting speech to text" },
  { id: "summarizing",  label: "Summarizing",  detail: "Our AI is analyzing your video" },
];

type StageStatus = "done" | "active" | "pending" | "error";

function getStageStatus(stageId: JobStage, job: JobState): StageStatus {
  const order = STAGES.map((s) => s.id);
  const si = order.indexOf(stageId);
  const ci = job.stage ? order.indexOf(job.stage) : -1;

  if (job.status === "done") return "done";
  if (job.status === "failed") {
    if (si < ci) return "done";
    if (si === ci) return "error";
    return "pending";
  }
  if (si < ci) return "done";
  if (si === ci) return "active";
  return "pending";
}

export function JobProgress({ job }: Props) {
  const isFailed = job.status === "failed";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-1.5">
        {isFailed ? (
          <p className="text-xl font-bold text-coral">Processing failed</p>
        ) : (
          <>
            <p className="text-xl font-bold text-ink">Processing your video…</p>
            <p className="text-sm text-ink/50">
              Long videos may take a few minutes. Each stage is shown below.
            </p>
          </>
        )}
        <p className="text-[11px] font-mono text-ink/30 mt-1 tracking-wide">
          {job.job_id}
        </p>
      </div>

      {/* Stage cards */}
      <div className="neo-card divide-y-2 divide-ink/8 overflow-hidden">
        {STAGES.map((s) => {
          const status = getStageStatus(s.id, job);
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-4 px-5 py-4 transition-colors",
                status === "active" && "bg-coral/5"
              )}
            >
              {/* Status icon */}
              <div className="shrink-0 w-6 flex justify-center">
                {status === "done" && <CheckCircle2 size={22} className="text-emerald-500" />}
                {status === "active" && <Loader2 size={22} className="text-coral animate-spin" />}
                {status === "pending" && <Circle size={22} className="text-ink/20" />}
                {status === "error" && <XCircle size={22} className="text-coral" />}
              </div>

              {/* Label + detail */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold",
                  status === "done"    && "text-ink/70",
                  status === "active"  && "text-ink",
                  status === "pending" && "text-ink/30",
                  status === "error"   && "text-coral",
                )}>
                  {s.label}
                </p>
                <p className={cn(
                  "text-xs mt-0.5 truncate",
                  status === "pending" ? "text-ink/25" : "text-ink/45"
                )}>
                  {s.detail}
                </p>
              </div>

              {/* Badge */}
              {status === "active" && (
                <span className="shrink-0 text-xs font-semibold text-coral bg-coral/10 border border-coral/20 px-2.5 py-0.5 rounded-full">
                  In progress
                </span>
              )}
              {status === "done" && (
                <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Done
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error details */}
      {isFailed && job.error && (
        <div className="neo-card-sm border-coral/40 bg-coral/5 px-5 py-4 text-sm">
          {job.error.startsWith("NO_AUDIO:") ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="text-3xl">🔇</span>
              <p className="font-semibold text-ink">This file has no audio</p>
              <p className="text-ink/60 text-sm">
                Try uploading a file that contains speech or audio.
              </p>
            </div>
          ) : (
            <>
              <p className="font-semibold text-coral mb-1">What went wrong</p>
              <p className="font-mono text-xs text-ink/70 break-words leading-relaxed">
                {job.error}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
