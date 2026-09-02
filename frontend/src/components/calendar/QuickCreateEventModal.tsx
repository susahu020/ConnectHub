'use client';

import React, { useState } from 'react';
import { X, Trello, Video, Loader2 } from 'lucide-react';

// Previously there was no way to create anything from the calendar itself
// — you had to navigate to Tasks or Meetings, create there, then come
// back to see it plotted. This is a deliberately minimal quick-add: a
// title and (for meetings) a time, defaulting everything else sensibly
// (task assigned to yourself, meeting with no invitees yet — both are
// easy to fill in more fully by opening the real Tasks/Meetings page
// afterward).
export function QuickCreateEventModal({
  date,
  onClose,
  onCreateTask,
  onCreateMeeting,
  submitting,
}: {
  date: Date;
  onClose: () => void;
  onCreateTask: (title: string) => void;
  onCreateMeeting: (title: string, time: string) => void;
  submitting: boolean;
}) {
  const [kind, setKind] = useState<'task' | 'meeting'>('task');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === 'task') {
      onCreateTask(title.trim());
    } else {
      onCreateMeeting(title.trim(), time);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <form onSubmit={handleSubmit} className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg">New Event</h3>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind('task')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              kind === 'task' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted dark:hover:bg-card'
            }`}
          >
            <Trello className="h-3.5 w-3.5" />
            Task
          </button>
          <button
            type="button"
            onClick={() => setKind('meeting')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              kind === 'meeting' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted dark:hover:bg-card'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            Meeting
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-muted-foreground uppercase text-[10px] font-bold">
            {kind === 'task' ? 'Task title' : 'Meeting title'}
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'task' ? 'e.g. Finish Q3 report' : 'e.g. Weekly sync'}
            className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none text-sm"
          />
        </div>

        {kind === 'meeting' && (
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase text-[10px] font-bold">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none text-sm"
            />
          </div>
        )}

        <p className="text-[10px] text-muted-foreground normal-case">
          {kind === 'task'
            ? "Creates the task assigned to you with this due date — open it in Tasks afterward to add more detail or reassign it."
            : 'Creates the meeting with no invitees yet — open it in Meetings afterward to invite people.'}
        </p>

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {kind === 'task' ? 'Create Task' : 'Schedule Meeting'}
        </button>
      </form>
    </div>
  );
}
