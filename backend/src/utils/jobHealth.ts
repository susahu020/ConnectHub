/**
 * In-memory heartbeat tracker for the app's background interval jobs
 * (see index.ts). Each job reports in after every run via `recordJobRun`;
 * the System Health endpoint (admin.controller.ts getSystemHealth) reads
 * this to show whether each job is running on schedule or has started
 * failing/stalling. Intentionally in-memory (not persisted) — this reflects
 * the health of *this running process*, which is exactly what an admin
 * wants to know as of right now, not a historical log.
 */

export interface JobHealthEntry {
  name: string;
  intervalMs: number;
  lastRunAt: string | null;
  lastSuccess: boolean | null;
  lastError: string | null;
  lastDurationMs: number | null;
  lastResultSummary: string | null;
}

const jobs: Record<string, JobHealthEntry> = {};

export const registerJob = (key: string, name: string, intervalMs: number) => {
  jobs[key] = {
    name,
    intervalMs,
    lastRunAt: null,
    lastSuccess: null,
    lastError: null,
    lastDurationMs: null,
    lastResultSummary: null,
  };
};

export const recordJobRun = (
  key: string,
  success: boolean,
  durationMs: number,
  resultSummary?: string,
  error?: string
) => {
  const job = jobs[key];
  if (!job) return;
  job.lastRunAt = new Date().toISOString();
  job.lastSuccess = success;
  job.lastDurationMs = durationMs;
  job.lastResultSummary = resultSummary ?? null;
  job.lastError = error ?? null;
};

export const getJobsHealth = (): JobHealthEntry[] => Object.values(jobs);
