import React from 'react';
import { X, MapPin, Globe, Clock, GitFork, Compass, Sparkles, Mail, Phone, MessageSquare } from 'lucide-react';
import { statusDotColor } from './statusColors';

export function ColleagueDetailModal({
  user,
  currentUserId,
  reportingChain,
  onClose,
  onStartChat,
}: {
  user: any;
  currentUserId?: string;
  reportingChain: any[];
  onClose: () => void;
  onStartChat: (u: any) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-extrabold uppercase text-slate-500 overflow-hidden border-2">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                `${user.firstName[0]}${user.lastName[0]}`
              )}
            </div>
            <span className={`absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-2 border-white dark:border-slate-900 ${statusDotColor(user.status)}`} />
          </div>

          <div>
            <h3 className="font-extrabold text-base">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-xs text-primary font-bold uppercase tracking-wider mt-0.5">{user.designation}</p>
            <p className="text-[10px] text-slate-400 font-semibold">
              {user.location || 'Remote'} • {user.department?.name || 'General Org'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs font-semibold text-slate-650 dark:text-slate-350 text-left">
          <div>
            <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>Office Location</span>
            </h4>
            <p className="font-bold text-slate-800 dark:text-slate-200">{user.officeLocation || user.location || 'Main Office'}</p>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>Time Zone</span>
            </h4>
            <p className="font-bold text-slate-800 dark:text-slate-200">{user.timezone || 'UTC'}</p>
          </div>
          {user.workingHours && (
            <div className="col-span-2">
              <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Working Hours</span>
              </h4>
              <p className="font-bold text-slate-800 dark:text-slate-200">{user.workingHours}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4 text-left">
          <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider flex items-center space-x-1.5">
            <GitFork className="h-3.5 w-3.5 transform rotate-180 text-slate-400" />
            <span>Reporting Manager Tree</span>
          </h4>
          <div className="pl-3 py-1 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            {reportingChain.length === 0 ? (
              <div className="text-[10px] text-slate-400 italic">Reports to no one (Top of hierarchy)</div>
            ) : (
              <>
                {[...reportingChain].reverse().map((mgr: any) => (
                  <div key={mgr.id} className="flex items-center space-x-2 text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-350 dark:bg-slate-650 shrink-0" />
                    <span className="font-bold text-[10px]">
                      {mgr.firstName} {mgr.lastName}
                    </span>
                    <span className="text-[10px] text-slate-400">({mgr.designation || 'Staff'})</span>
                  </div>
                ))}
                <div className="flex items-center space-x-2 text-primary font-bold">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-primary/80">(Selected)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {user.bio && (
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider flex items-center space-x-1">
              <Compass className="h-3.5 w-3.5 text-slate-400" />
              <span>Biography</span>
            </h4>
            <p className="p-3 bg-slate-50/50 dark:bg-slate-850/45 border rounded-xl text-slate-600 dark:text-slate-350 leading-relaxed">{user.bio}</p>
          </div>
        )}

        {user.skills?.length > 0 && (
          <div className="space-y-1.5 text-xs">
            <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider flex items-center space-x-1">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              <span>Technical Competencies</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((s: string) => (
                <span key={s} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border rounded-xl text-[10px] font-bold text-slate-500">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
          <div className="flex items-center space-x-2.5">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href={`mailto:${user.email}`} className="hover:underline">
              {user.email}
            </a>
          </div>
          {user.phone && (
            <div className="flex items-center space-x-2.5">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        {user.id !== currentUserId && (
          <button
            onClick={() => onStartChat(user)}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>DM {user.firstName}</span>
          </button>
        )}
      </div>
    </div>
  );
}
