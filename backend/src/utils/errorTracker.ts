/**
 * Tracks recent 5xx (and, separately, all) request errors in a small
 * in-memory ring buffer. Wired into error.middleware.ts so every unhandled
 * error in the app is recorded automatically. Consumed by the System Health
 * endpoint (admin.controller.ts getSystemHealth) to show a live error rate
 * and a short recent-errors list — deliberately in-memory and capped, since
 * this is meant to answer "is something actively wrong right now", not to
 * replace real log aggregation.
 */

export interface TrackedError {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
}

const MAX_ENTRIES = 50;
const recentErrors: TrackedError[] = [];
let totalErrorCount = 0;
let totalRequestCount = 0;

export const trackRequest = () => {
  totalRequestCount++;
};

export const trackError = (method: string, path: string, statusCode: number, message: string) => {
  totalErrorCount++;
  recentErrors.unshift({
    timestamp: new Date().toISOString(),
    method,
    path,
    statusCode,
    message: String(message).slice(0, 300),
  });
  if (recentErrors.length > MAX_ENTRIES) {
    recentErrors.length = MAX_ENTRIES;
  }
};

export const getErrorStats = () => {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentCount = recentErrors.filter((e) => new Date(e.timestamp).getTime() >= fiveMinAgo).length;
  return {
    totalRequests: totalRequestCount,
    totalErrors: totalErrorCount,
    errorsLast5Min: recentCount,
    recentErrors: recentErrors.slice(0, 10),
  };
};
