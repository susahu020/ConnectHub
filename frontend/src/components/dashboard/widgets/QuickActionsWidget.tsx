import React from 'react';
import Link from 'next/link';
import { Play, Plus, Megaphone, FolderOpen, MessageSquare } from 'lucide-react';
import { WidgetHeader } from '../WidgetHeader';

const SHORTCUTS = [
  { href: '/tasks', label: 'New Task', icon: <Plus />, badgeClass: 'bg-emerald-500/10 text-emerald-500' },
  { href: '/announcements', label: 'Bulletin', icon: <Megaphone />, badgeClass: 'bg-primary/10 text-primary' },
  { href: '/files', label: 'Upload File', icon: <FolderOpen />, badgeClass: 'bg-indigo-500/10 text-indigo-500' },
  { href: '/chat', label: 'Start DM', icon: <MessageSquare />, badgeClass: 'bg-primary/10 text-primary' },
];

export function QuickActionsWidget() {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <WidgetHeader icon={<Play />} iconClassName="text-indigo-500" title="Quick Shortcuts" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href + s.label}
            href={s.href}
            className="flex flex-col items-center justify-center p-4 border border-border/60 rounded-2xl hover:bg-muted/50 hover:border-primary/30 text-foreground transition-all duration-300 hover:shadow-md group gap-2 bg-white/40 dark:bg-slate-900/40"
          >
            <div
              className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-sm [&>svg]:h-5 [&>svg]:w-5 ${s.badgeClass}`}
            >
              {s.icon}
            </div>
            <span className="text-xs font-bold tracking-tight">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
