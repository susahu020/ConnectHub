import React from 'react';
import Link from 'next/link';
import { X, AlertCircle, Video } from 'lucide-react';

export function CalendarEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative text-left">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 border-b pb-3.5">
          <div className={`p-2.5 rounded-xl ${event.color}`}>
            <event.icon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">{event.type} feed</span>
            <h3 className="font-extrabold text-base text-foreground leading-snug">{event.title}</h3>
          </div>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px] block">Details & Scope</label>
            <p className="text-muted-foreground dark:text-foreground bg-muted dark:bg-card/40 p-3 rounded-2xl border leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-muted-foreground bg-muted/50 dark:bg-card/20 px-3 py-2 rounded-xl border border-dashed">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{event.meta}</span>
          </div>

          {event.link && (
            <Link
              href={event.link}
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl font-bold shadow-md transition-all text-center"
            >
              <Video className="h-4 w-4" />
              <span>Launch Collaborative Call</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
