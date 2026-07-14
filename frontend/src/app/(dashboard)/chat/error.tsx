'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white dark:bg-slate-950 border rounded-2xl shadow-xl animate-fade-in">
        <div className="h-14 w-14 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="h-7 w-7 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Failed to Load Direct Chat</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            There was an error communicating with the chat services. Please check your connection and try again.
          </p>
        </div>
        {error.message && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] text-muted-foreground font-mono truncate">
            {error.message}
          </div>
        )}
        <button
          onClick={() => reset()}
          className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center justify-center space-x-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload Chat Workspace</span>
        </button>
      </div>
    </div>
  );
}
