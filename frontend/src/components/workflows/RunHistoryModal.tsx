'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

// Previously the only run-history surfaced anywhere in the UI was a
// single "Last run: <time>" badge per workflow card — no way to see
// anything before the most recent run, or read the actual error message
// behind a failed one beyond a tooltip. This shows the full history
// GET /workflows/:id/runs already returns.
export function RunHistoryModal({
  workflowId,
  workflowName,
  onClose,
}: {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['workflow-runs', workflowId],
    queryFn: () => api.getWorkflowRuns(workflowId),
  });

  const successCount = runs.filter((r: any) => r.status === 'SUCCESS').length;
  const failedCount = runs.length - successCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Run History</h3>
          <p className="text-xs text-muted-foreground">{workflowName}</p>
          {runs.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              <span className="text-emerald-500 font-bold">{successCount} succeeded</span>
              {failedCount > 0 && (
                <>
                  {' · '}
                  <span className="text-rose-500 font-bold">{failedCount} failed</span>
                </>
              )}
              {' · '}{runs.length} total
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">This automation hasn't run yet.</p>
          ) : (
            runs.map((run: any) => {
              const isSuccess = run.status === 'SUCCESS';
              return (
                <div
                  key={run.id}
                  className={`p-3 rounded-xl border ${
                    isSuccess
                      ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950'
                      : 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isSuccess ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                      {isSuccess ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {isSuccess ? 'Success' : 'Failed'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(run.ranAt).toLocaleString()}</span>
                  </div>
                  {!isSuccess && run.error && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1.5 font-mono break-words">{run.error}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
