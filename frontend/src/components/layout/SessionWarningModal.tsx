'use client';

import React from 'react';
import { Clock } from 'lucide-react';

export function SessionWarningModal({
  countdown,
  onSignOut,
  onStayLoggedIn,
}: {
  countdown: number;
  onSignOut: () => void;
  onStayLoggedIn: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-border p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative text-center">
        <div className="p-3 bg-amber-500/10 w-fit mx-auto rounded-full text-amber-500">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 id="session-warning-title" className="font-bold text-base">
            Inactivity Warning
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Your session is expiring in{' '}
            <span className="font-extrabold text-red-500 text-sm">{countdown}</span> seconds due
            to inactivity.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px] font-semibold">
          <button
            onClick={onSignOut}
            className="py-2.5 px-4 bg-muted hover:bg-muted/70 text-foreground rounded-xl transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={onStayLoggedIn}
            className="py-2.5 px-4 bg-primary text-primary-foreground rounded-xl shadow transition-colors hover:bg-primary-dark"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
