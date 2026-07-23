import React from 'react';
import { MapPin, Briefcase, Globe, MessageSquare } from 'lucide-react';
import { statusDotColor } from './statusColors';

export function DirectoryGrid({
  users,
  currentUserId,
  onSelectUser,
  onStartChat,
}: {
  users: any[];
  currentUserId?: string;
  onSelectUser: (u: any) => void;
  onStartChat: (u: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {users.map((colleague: any) => (
        <div
          key={colleague.id}
          onClick={() => onSelectUser(colleague)}
          className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden"
        >
          <div className="space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-11 w-11 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-extrabold uppercase text-slate-500 overflow-hidden shrink-0">
                  {colleague.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={colleague.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${colleague.firstName[0]}${colleague.lastName[0]}`
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${statusDotColor(
                    colleague.status
                  )}`}
                />
              </div>
              <div className="min-w-0 text-left">
                <h4 className="font-extrabold text-xs leading-none truncate group-hover:text-primary transition-all">
                  {colleague.firstName} {colleague.lastName}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-1 truncate font-semibold leading-none">
                  {colleague.designation || 'Teammate'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px] text-slate-505 dark:text-slate-400 font-semibold leading-none text-left">
              <div className="flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-405" />
                <span>{colleague.officeLocation || colleague.location || 'Remote'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-405" />
                <span>{colleague.department?.name || 'General Org'}</span>
              </div>
              {colleague.timezone && (
                <div className="flex items-center space-x-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-405" />
                  <span>Timezone: {colleague.timezone}</span>
                </div>
              )}
            </div>

            {colleague.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {colleague.skills.slice(0, 3).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border rounded-full text-[10px] font-bold text-slate-500">
                    {s}
                  </span>
                ))}
                {colleague.skills.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-extrabold self-center">+{colleague.skills.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {colleague.id !== currentUserId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartChat(colleague);
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold rounded-xl transition-all"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Start Conversation</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
