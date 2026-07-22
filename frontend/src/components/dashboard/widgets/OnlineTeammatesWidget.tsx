import React from 'react';
import { Users } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function OnlineTeammatesWidget({ onlineUsers }: { onlineUsers: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<Users />} title="Online Teammates" />
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
        {!onlineUsers || onlineUsers.length === 0 ? (
          <WidgetEmptyState label="Only you are online." />
        ) : (
          onlineUsers.map((olUser: any) => (
            <div key={olUser.id} className="flex items-center gap-3 p-1 rounded-xl">
              <div className="relative shrink-0">
                <div className="h-9 w-9 bg-muted rounded-full flex items-center justify-center font-bold text-xs uppercase text-muted-foreground ring-1 ring-border">
                  {olUser.firstName[0]}
                  {olUser.lastName[0]}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate leading-tight">
                  {olUser.firstName} {olUser.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  {olUser.designation || 'Engineer'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
