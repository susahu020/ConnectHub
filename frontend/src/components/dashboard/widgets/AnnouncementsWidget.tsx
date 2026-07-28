import React from 'react';
import { Megaphone } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function AnnouncementsWidget({ announcements }: { announcements: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader
        icon={<Megaphone />}
        title="Latest Announcements"
        action={{ label: 'Bulletin', href: '/announcements' }}
      />
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
        {!announcements || announcements.length === 0 ? (
          <WidgetEmptyState label="No announcements." />
        ) : (
          announcements.map((ann: any) => (
            <div
              key={ann.id}
              className="p-3.5 border border-border/60 rounded-xl hover:bg-muted/40 hover:border-primary/20 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold">
                  {ann.creator.firstName} {ann.creator.lastName}
                </span>
                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="font-semibold text-[13px] truncate leading-snug">{ann.title}</h4>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{ann.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
