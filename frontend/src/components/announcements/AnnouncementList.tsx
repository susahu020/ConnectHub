import React from 'react';
import { Pin, Calendar, Eye, Heart, MessageSquare } from 'lucide-react';
import { getPriorityBadge } from './announcementHelpers';

export function AnnouncementList({
  isLoading,
  announcements,
  activeId,
  onSelect,
}: {
  isLoading: boolean;
  announcements: any[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return <div className="text-center text-xs text-muted-foreground py-10">Loading bulletins...</div>;
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-10 border rounded-2xl bg-card dark:bg-card">
        No matching bulletins found.
      </div>
    );
  }

  return (
    <div className="md:col-span-2 space-y-4">
      {announcements.map((ann: any) => (
        <div
          key={ann.id}
          onClick={() => onSelect(ann.id)}
          className={`bg-card dark:bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden space-y-3 ${
            activeId === ann.id ? 'border-primary ring-2 ring-primary/10' : ''
          }`}
        >
          {ann.isPinned && (
            <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-bl border-l border-b border-primary/20 flex items-center space-x-0.5">
              <Pin className="h-2.5 w-2.5" />
              <span>Pinned</span>
            </div>
          )}

          {ann.expiresAt && new Date(ann.expiresAt) < new Date() && (
            <div className="absolute top-0 right-16 bg-muted dark:bg-card text-muted-foreground text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-bl border-l border-b border-border dark:border-border flex items-center space-x-0.5">
              <span>Expired</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(ann.priority)}`}>
              {ann.priority}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Published by {ann.creator.firstName} {ann.creator.lastName}
            </span>
          </div>

          <h3 className="font-extrabold text-sm leading-snug">{ann.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{ann.content}</p>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t font-semibold">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
            </span>

            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Eye className="h-3.5 w-3.5" />
                <span>{ann.viewsCount} views</span>
              </span>
              <span className="flex items-center space-x-1">
                <Heart className="h-3.5 w-3.5" />
                <span>{ann._count?.likes || 0} likes</span>
              </span>
              <span className="flex items-center space-x-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{ann._count?.comments || 0} replies</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
