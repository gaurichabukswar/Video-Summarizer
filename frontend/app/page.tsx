"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Shield, Clock } from "lucide-react";
import { fetchJob } from "@/lib/api";
import { VideoInput } from "@/components/VideoInput";
import { JobProgress } from "@/components/JobProgress";
import { SummaryResults } from "@/components/SummaryResults";
import { LogoMark } from "@/components/LogoMark";

type AppState =
  | { phase: "input" }
  | { phase: "polling"; jobId: string }
  | { phase: "done"; jobId: string };

const FEATURES = [
  { icon: Shield, label: "Works without captions" },
  { icon: Zap, label: "Very quick processing" },
  { icon: Clock, label: "Files deleted after processing" },
];

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({ phase: "input" });

  const jobId =
    appState.phase === "polling" || appState.phase === "done"
      ? appState.jobId
      : null;

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "done" || s === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (
      job &&
      (job.status === "done" || job.status === "failed") &&
      appState.phase === "polling"
    ) {
      setAppState({ phase: "done", jobId: job.job_id });
    }
  }, [job, appState.phase]);

  const handleJobCreated = (id: string) => setAppState({ phase: "polling", jobId: id });
  const handleReset = () => setAppState({ phase: "input" });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5EFE0" }}>
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b-2 border-ink/10 bg-[#F5EFE0]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-center items-center gap-3">
          <LogoMark size={36} />
          <span className="font-bold text-ink text-base tracking-tight">Video Summarizer</span>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center w-full">
        {appState.phase === "input" && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-8 sm:gap-10">

            {/* Badge */}
            <div className="pill-badge animate-fade-up">
              <Zap size={11} className="text-coral fill-coral" />
              Read videos in seconds
            </div>

            {/* Hero heading */}
            <div className="text-center space-y-3 max-w-2xl animate-fade-up" style={{ animationDelay: "60ms" }}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink leading-[1.1] tracking-tight text-balance">
                Turn any video into a{" "}
                <span className="text-coral">clear, readable</span>{" "}
                summary.
              </h1>
              <p className="text-base sm:text-lg text-ink/60 max-w-lg mx-auto leading-relaxed text-balance">
                Paste a link or upload a file. We transcribe the audio and hand
                back a tight summary, key highlights, and the full transcript —
                even when there are no captions.
              </p>
            </div>

            {/* Input */}
            <div className="w-full animate-fade-up" style={{ animationDelay: "120ms" }}>
              <VideoInput onJobCreated={handleJobCreated} />
            </div>

            {/* Feature pills — visible on all sizes, stacked on mobile */}
            <div
              className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 pt-2 animate-fade-up"
              style={{ animationDelay: "180ms" }}
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-ink/50">
                  <div className="w-5 h-5 rounded bg-coral/15 flex items-center justify-center">
                    <Icon size={11} className="text-coral" />
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Polling / done state ──────────────────────────────────── */}
        {(appState.phase === "polling" || appState.phase === "done") && (
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {!job && (
              /* Skeleton while first fetch resolves */
              <div className="space-y-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-ink/10 rounded-2xl" />
                ))}
              </div>
            )}

            {job && (job.status === "queued" || job.status === "processing") && (
              <JobProgress job={job} />
            )}

            {job?.status === "done" && job.result && (
              <SummaryResults
                result={job.result}
                jobId={job.job_id}
                onReset={handleReset}
              />
            )}

            {job?.status === "failed" && (
              <div className="space-y-6">
                <JobProgress job={job} />
                <div className="text-center">
                  <button onClick={handleReset} className="btn-coral">
                    Try another video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t-2 border-ink/10 py-5 text-center text-xs text-ink/35 tracking-wide">
        Video Summarizer — AI-powered video analysis
      </footer>
    </div>
  );
}
