'use client';

import React from 'react';
import { X, Archive, RotateCcw, Loader2 } from 'lucide-react';

// Standalone rather than folded into the main channel list/filter logic in
// groups/page.tsx (followed/suggested/category filtering) — archived
// channels are a separate, occasionally-visited concern, so a lightweight
// modal keeps this additive instead of threading a new state dimension
// through that already-large filtering pipeline.
export function ArchivedChannelsModal({
  open,
  onClose,
  loading,
  channels,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  channels: any[];
  onRestore: (groupId: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            Archived Channels
          </h3>
          <p className="text-xs text-muted-foreground">
            Archived channels keep their message history but are hidden from your main channel list. Restore one to bring it back.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : channels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No archived channels.</p>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted dark:bg-card"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{ch.name}</p>
                  {ch.archivedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Archived {new Date(ch.archivedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRestore(ch.id)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
