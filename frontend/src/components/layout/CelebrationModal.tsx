'use client';

import React from 'react';
import { X } from 'lucide-react';

export function CelebrationModal({
  emoji,
  title,
  message,
  confettiEmojis,
  onDismiss,
}: {
  emoji: string;
  title: string;
  message: string;
  confettiEmojis: string[];
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl w-full max-w-md p-8 shadow-2xl relative text-center overflow-hidden">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-5 right-5 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6 relative z-10 flex flex-col items-center">
          <div className="text-6xl animate-bounce">{emoji}</div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground leading-tight">{title}</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-sm">{message}</p>
          </div>

          <div className="flex gap-2">
            {confettiEmojis.map((e, i) => (
              <span key={i} className="text-2xl animate-pulse">
                {e}
              </span>
            ))}
          </div>

          <button
            onClick={onDismiss}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl hover:bg-primary-dark shadow-md hover:shadow-lg transition-all"
          >
            Thank you! ❤️
          </button>
        </div>
      </div>
    </div>
  );
}
