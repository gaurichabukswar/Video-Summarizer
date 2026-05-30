"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
  Clock,
  Lightbulb,
  ListChecks,
  BookOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryResult } from "@/lib/api";

interface Props {
  result: SummaryResult;
  jobId: string;
  onReset: () => void;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handle}
      title="Copy to clipboard"
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-ink/40 hover:text-ink/70 transition-colors px-2 py-1 rounded-lg hover:bg-ink/5",
        className
      )}
    >
      {copied ? (
        <><CheckCheck size={13} className="text-emerald-500" /> Copied</>
      ) : (
        <><Copy size={13} /> Copy</>
      )}
    </button>
  );
}

function ResultCard({
  icon,
  title,
  copyText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="neo-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-ink/8 bg-cream/50">
        <div className="flex items-center gap-2 font-semibold text-sm text-ink">
          {icon}
          {title}
        </div>
        <CopyButton text={copyText} />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function SummaryResults({ result, jobId, onReset }: Props) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const exportText = [
    "SUMMARY",
    "───────",
    result.summary,
    "",
    "KEY POINTS",
    "──────────",
    ...result.key_points.map((p) => `• ${p}`),
    ...(result.key_moments?.length
      ? ["", "KEY MOMENTS", "───────────", ...result.key_moments.map((m) => `[${m.timestamp}] ${m.description}`)]
      : []),
    ...(result.action_items?.length
      ? ["", "ACTION ITEMS", "────────────", ...result.action_items.map((a) => `• ${a}`)]
      : []),
    "",
    "TRANSCRIPT",
    "──────────",
    result.transcript,
  ].join("\n");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-up">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-coral" />
            <h2 className="text-xl font-bold text-ink">Summary ready</h2>
          </div>
          <p className="text-[11px] font-mono text-ink/30 tracking-wide">{jobId}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={exportText} className="border-2 border-ink/15 rounded-lg" />
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-medium text-ink/50 hover:text-ink transition-colors border-2 border-ink/15 hover:border-ink/40 px-3 py-1.5 rounded-lg"
          >
            <RotateCcw size={13} />
            New video
          </button>
        </div>
      </div>

      {/* Overview */}
      <ResultCard
        icon={<BookOpen size={15} className="text-coral" />}
        title="Overview"
        copyText={result.summary}
      >
        <p className="text-sm text-ink/80 leading-relaxed">{result.summary}</p>
      </ResultCard>

      {/* Key points */}
      {result.key_points.length > 0 && (
        <ResultCard
          icon={<Lightbulb size={15} className="text-coral" />}
          title="Key Points"
          copyText={result.key_points.map((p) => `• ${p}`).join("\n")}
        >
          <ul className="space-y-2.5">
            {result.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink/80">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* Key moments */}
      {result.key_moments && result.key_moments.length > 0 && (
        <ResultCard
          icon={<Clock size={15} className="text-coral" />}
          title="Key Moments"
          copyText={result.key_moments.map((m) => `[${m.timestamp}] ${m.description}`).join("\n")}
        >
          <div className="space-y-2.5">
            {result.key_moments.map((m, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-mono text-xs font-semibold text-coral bg-coral/10 border border-coral/20 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                  {m.timestamp}
                </span>
                <span className="text-ink/80">{m.description}</span>
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {/* Action items */}
      {result.action_items && result.action_items.length > 0 && (
        <ResultCard
          icon={<ListChecks size={15} className="text-coral" />}
          title="Action Items"
          copyText={result.action_items.map((a) => `• ${a}`).join("\n")}
        >
          <ul className="space-y-2.5">
            {result.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink/80">
                <span className="mt-0.5 text-coral shrink-0 text-base leading-none">☐</span>
                {item}
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* Collapsible transcript — header is a div, not a button, to avoid nested button error */}
      <div className="neo-card overflow-hidden">
        <div
          onClick={() => setTranscriptOpen((o) => !o)}
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-cream/50 transition-colors select-none"
          role="button"
          aria-expanded={transcriptOpen}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setTranscriptOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 font-semibold text-sm text-ink">
            <BookOpen size={15} className="text-coral" />
            Full Transcript
          </div>
          <div className="flex items-center gap-2">
            {transcriptOpen && (
              <CopyButton text={result.transcript} />
            )}
            <span className="text-ink/40">
              {transcriptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
        </div>
        {transcriptOpen && (
          <>
            <div className="border-t-2 border-ink/8" />
            <div className="px-5 py-4 max-h-80 overflow-y-auto scrollbar-thin">
              <p className="text-xs text-ink/70 leading-relaxed whitespace-pre-wrap font-mono">
                {result.transcript}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
