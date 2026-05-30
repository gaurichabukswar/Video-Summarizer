const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type JobStatus = "queued" | "processing" | "done" | "failed";
export type JobStage = "fetching" | "extracting" | "transcribing" | "summarizing";

export interface KeyMoment {
  timestamp: string;
  description: string;
}

export interface SummaryResult {
  summary: string;
  key_points: string[];
  key_moments: KeyMoment[] | null;
  action_items: string[] | null;
  transcript: string;
}

export interface JobState {
  job_id: string;
  status: JobStatus;
  stage: JobStage | null;
  progress: number | null;
  result: SummaryResult | null;
  error: string | null;
}

export async function submitUrl(url: string): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Failed to submit URL");
  }
  return res.json();
}

export async function submitFile(file: File): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Failed to submit file");
  }
  return res.json();
}

export async function fetchJob(jobId: string): Promise<JobState> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Failed to fetch job");
  }
  return res.json();
}
