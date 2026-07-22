import React from 'react';
import { Clock, Check, Settings } from 'lucide-react';

export function WelcomeHeader({
  greeting,
  firstName,
  currentTime,
  isEditing,
  isSaving,
  onDiscard,
  onSave,
  onStartEditing,
}: {
  greeting: string;
  firstName?: string;
  currentTime: Date | null;
  isEditing: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onStartEditing: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400">
          {greeting}, {firstName}! 👋
        </h1>
        {currentTime && (
          <p className="text-[11px] bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider w-fit mt-1.5 flex items-center gap-1.5 border border-border/60 leading-none">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} •{' '}
              {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              onClick={onDiscard}
              className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors bg-white dark:bg-slate-900 shadow-sm"
            >
              Discard
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary-dark transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Save Layout</span>
            </button>
          </>
        ) : (
          <button
            onClick={onStartEditing}
            className="px-4 py-2 border border-border/70 rounded-xl text-xs font-semibold text-foreground hover:bg-muted/60 hover:border-primary/30 transition-colors bg-white/70 dark:bg-slate-900/60 shadow-sm flex items-center gap-1.5 backdrop-blur-md"
          >
            <Settings className="h-4 w-4 text-primary shrink-0" />
            <span>Customize Widgets</span>
          </button>
        )}
      </div>
    </div>
  );
}
