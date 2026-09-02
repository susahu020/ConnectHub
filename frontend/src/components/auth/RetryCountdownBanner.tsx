'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { formatRetrySeconds } from '../../hooks/useRetryCountdown';

// Renders nothing when there's no active countdown, so it's safe to mount
// unconditionally right above a submit button.
export function RetryCountdownBanner({ secondsLeft, message }: { secondsLeft: number; message?: string }) {
  if (secondsLeft <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-500"
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>
        {message || 'Too many attempts.'} Try again in{' '}
        <span className="tabular-nums">{formatRetrySeconds(secondsLeft)}</span>.
      </span>
    </div>
  );
}
