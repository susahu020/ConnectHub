import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function AccountSummaryBanner({ user }: { user: any }) {
  if (!user) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 border rounded-full flex items-center justify-center text-xl font-extrabold uppercase text-slate-500 overflow-hidden shrink-0 shadow-2xs">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            `${user.firstName[0]}${user.lastName[0]}`
          )}
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base leading-none text-slate-850 dark:text-slate-200">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-xs text-slate-400 font-semibold leading-none">
            {user.designation || 'Company Teammate'} • {user.email}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded-full text-[10px] font-black uppercase tracking-wider">
              Role: {user.role}
            </span>
            {user.department && (
              <span className="px-2 py-0.5 bg-info/10 dark:bg-info/15 text-info-dark dark:text-info border border-info/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                {user.department.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-900/30 uppercase tracking-wider">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>✓ Verified Account</span>
      </div>
    </div>
  );
}
