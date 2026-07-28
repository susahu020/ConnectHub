import React from 'react';
import { FolderOpen } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function ProjectsWidget({ projects }: { projects: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<FolderOpen />} iconClassName="text-emerald-500" title="Active Projects" />
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
        {!projects || projects.length === 0 ? (
          <WidgetEmptyState label="No active projects." />
        ) : (
          projects.map((proj: any) => (
            <div
              key={proj.id}
              className="p-3 border border-border/70 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="font-semibold text-[13px] truncate leading-snug">{proj.name}</h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Team: {proj.team?.name || 'General'}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary shrink-0">
                {proj.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
