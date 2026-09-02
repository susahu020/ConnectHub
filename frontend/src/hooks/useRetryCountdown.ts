'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Small, form-agnostic countdown used wherever a request can come back
// blocked with a known wait time — IP rate limiting (429, code
// RATE_LIMIT_EXCEEDED) and account lockout after repeated failed logins
// (423, code ACCOUNT_LOCKED) both now return `retryAfterSeconds` (see
// services/api.ts and backend middleware/rateLimiter.ts +
// auth.controller.ts's login). Previously these only ever surfaced as a
// one-shot toast ("try again in 15 minutes") with no way for the user to
// tell, without re-attempting, whether the wait is actually over — this
// keeps a live, ticking "try again in Ns" state the caller can render
// directly next to the submit button and use to disable it.
export function useRetryCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const retryAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    retryAtRef.current = null;
    setSecondsLeft(0);
  }, []);

  // Call with the `retryAfterSeconds` from a blocked response to start (or
  // extend) the countdown.
  const start = useCallback((seconds: number) => {
    if (!seconds || seconds <= 0) return;
    retryAtRef.current = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const remaining = retryAtRef.current ? Math.ceil((retryAtRef.current - Date.now()) / 1000) : 0;
      if (remaining <= 0) {
        clear();
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);
  }, [clear]);

  useEffect(() => () => clear(), [clear]);

  return { secondsLeft, isBlocked: secondsLeft > 0, start };
}

// Human-friendly "Xm Ys" / "Xs" formatting for the countdown above.
export function formatRetrySeconds(totalSeconds: number): string {
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${totalSeconds}s`;
}
